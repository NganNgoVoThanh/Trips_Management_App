// app/admin/statistics/total-savings/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, DollarSign, TrendingDown, Target, Download, Loader2, Zap, PiggyBank } from "lucide-react"
import { fabricService, Trip } from "@/lib/mysql-service"
import { authService } from "@/lib/auth-service"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface SavingsBreakdown {
  month: string
  savings: number
  tripsOptimized: number
  avgSavingsPerTrip: number
}

export default function TotalSavingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSavings: 0,
    ytdSavings: 0,
    monthlyAverage: 0,
    savingsRate: 0,
    optimizedTrips: 0,
    potentialSavings: 0,
    avgSavingsPerTrip: 0,
    topSavingRoute: { route: '', amount: 0 },
    savingsGoal: 50000000, // 50M VND goal
    goalProgress: 0
  })
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<SavingsBreakdown[]>([])
  const [savingsByVehicle, setSavingsByVehicle] = useState<any[]>([])

  useEffect(() => {
    loadSavingsData()
  }, [])

  const loadSavingsData = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const allTrips = await fabricService.getTrips()
      const optimizedTrips = allTrips.filter(t => t.status === 'optimized')
      
      // Calculate total savings
      const totalSavings = optimizedTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      // Calculate YTD savings (year to date)
      const currentYear = new Date().getFullYear()
      const ytdTrips = optimizedTrips.filter(t => {
        const tripYear = new Date(t.departureDate).getFullYear()
        return tripYear === currentYear
      })
      
      const ytdSavings = ytdTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      // Calculate potential savings from pending trips
      const pendingTrips = allTrips.filter(t => t.status === 'confirmed' && !t.optimizedGroupId)
      const potentialSavings = pendingTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          return sum + (trip.estimatedCost * 0.25) // Potential 25% savings
        }
        return sum
      }, 0)

      // Monthly breakdown
      const monthlyData: { [key: string]: SavingsBreakdown } = {}
      optimizedTrips.forEach(trip => {
        const date = new Date(trip.departureDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            savings: 0,
            tripsOptimized: 0,
            avgSavingsPerTrip: 0
          }
        }
        
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          const savings = trip.estimatedCost - actualCost
          monthlyData[monthKey].savings += savings
          monthlyData[monthKey].tripsOptimized += 1
        }
      })

      // Calculate average savings per trip
      Object.values(monthlyData).forEach(month => {
        month.avgSavingsPerTrip = month.tripsOptimized > 0 
          ? month.savings / month.tripsOptimized 
          : 0
      })

      const monthlyBreakdownArray = Object.values(monthlyData)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12)

      // Savings by vehicle type
      const vehicleTypes = ['car-4', 'car-7', 'van-16']
      const vehicleSavings = vehicleTypes.map(type => {
        const vehicleTrips = optimizedTrips.filter(t => t.vehicleType === type)
        const savings = vehicleTrips.reduce((sum, trip) => {
          if (trip.estimatedCost) {
            const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
            return sum + (trip.estimatedCost - actualCost)
          }
          return sum
        }, 0)
        
        return {
          type: type === 'car-4' ? '4-Seater Car' : 
                type === 'car-7' ? '7-Seater Car' : '16-Seater Van',
          savings,
          trips: vehicleTrips.length,
          avgSavingsPerTrip: vehicleTrips.length > 0 ? savings / vehicleTrips.length : 0
        }
      }).filter(v => v.trips > 0)

      // Top saving route
      const routeSavings: { [key: string]: number } = {}
      optimizedTrips.forEach(trip => {
        const route = `${getLocationName(trip.departureLocation)} → ${getLocationName(trip.destination)}`
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          const savings = trip.estimatedCost - actualCost
          routeSavings[route] = (routeSavings[route] || 0) + savings
        }
      })

      const topRoute = Object.entries(routeSavings)
        .sort((a, b) => b[1] - a[1])[0] || ['N/A', 0]

      // Savings rate
      const totalEstimatedCost = optimizedTrips.reduce((sum, t) => sum + (t.estimatedCost || 0), 0)
      const savingsRate = totalEstimatedCost > 0 ? (totalSavings / totalEstimatedCost) * 100 : 0

      const avgSavingsPerTrip = optimizedTrips.length > 0 ? totalSavings / optimizedTrips.length : 0
      const monthlyAverage = monthlyBreakdownArray.length > 0 
        ? totalSavings / monthlyBreakdownArray.length 
        : 0

      setStats({
        totalSavings,
        ytdSavings,
        monthlyAverage,
        savingsRate,
        optimizedTrips: optimizedTrips.length,
        potentialSavings,
        avgSavingsPerTrip,
        topSavingRoute: { route: topRoute[0], amount: topRoute[1] },
        savingsGoal: 50000000,
        goalProgress: (ytdSavings / 50000000) * 100
      })

      setMonthlyBreakdown(monthlyBreakdownArray)
      setSavingsByVehicle(vehicleSavings)
    } catch (error) {
      console.error('Error loading savings data:', error)
      toast({
        title: "Error",
        description: "Failed to load savings data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const csv = [
      ['Total Savings Report - ' + new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Total Savings (All Time)', formatCurrency(stats.totalSavings)],
      ['Year to Date Savings', formatCurrency(stats.ytdSavings)],
      ['Monthly Average', formatCurrency(stats.monthlyAverage)],
      ['Savings Rate', stats.savingsRate.toFixed(2) + '%'],
      ['Optimized Trips', stats.optimizedTrips],
      ['Average Savings per Trip', formatCurrency(stats.avgSavingsPerTrip)],
      ['Potential Additional Savings', formatCurrency(stats.potentialSavings)],
      ['Top Saving Route', stats.topSavingRoute.route + ' - ' + formatCurrency(stats.topSavingRoute.amount)],
      [],
      ['Monthly Breakdown'],
      ['Month', 'Savings', 'Trips Optimized', 'Avg Savings/Trip'],
      ...monthlyBreakdown.map(m => [
        m.month,
        formatCurrency(m.savings),
        m.tripsOptimized,
        formatCurrency(m.avgSavingsPerTrip)
      ]),
      [],
      ['Savings by Vehicle Type'],
      ['Vehicle Type', 'Total Savings', 'Trips', 'Avg Savings/Trip'],
      ...savingsByVehicle.map(v => [
        v.type,
        formatCurrency(v.savings),
        v.trips,
        formatCurrency(v.avgSavingsPerTrip)
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `savings-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AdminHeader />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <PiggyBank className="h-6 w-6 text-green-600" />
                Total Savings Analysis
              </h1>
              <p className="text-gray-500">Comprehensive view of cost savings through optimization</p>
            </div>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Main Savings Card */}
        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Total Savings Overview
              </span>
              <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                {formatCurrency(stats.totalSavings)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">YTD Savings</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.ytdSavings)}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Monthly Average</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthlyAverage)}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Avg per Trip</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgSavingsPerTrip)}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Savings Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.savingsRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Savings Goal Progress */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  Annual Savings Goal
                </span>
                <span className="text-sm font-bold text-green-600">
                  {stats.goalProgress.toFixed(1)}% of {formatCurrency(stats.savingsGoal)}
                </span>
              </div>
              <Progress value={Math.min(stats.goalProgress, 100)} className="h-3" />
              <p className="text-xs text-gray-500 mt-2">
                {formatCurrency(stats.savingsGoal - stats.ytdSavings)} remaining to reach goal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Potential Savings Alert */}
        {stats.potentialSavings > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900">Potential Additional Savings</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    By optimizing confirmed trips, you could save an additional <strong>{formatCurrency(stats.potentialSavings)}</strong>
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push('/admin/dashboard')}
                  >
                    Run Optimization
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Savings Breakdown</CardTitle>
              <CardDescription>Savings trends over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyBreakdown.map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                    <div>
                      <p className="font-medium">{month.month}</p>
                      <p className="text-xs text-gray-500">{month.tripsOptimized} trips optimized</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatCurrency(month.savings)}</p>
                      <p className="text-xs text-gray-500">Avg: {formatCurrency(month.avgSavingsPerTrip)}/trip</p>
                    </div>
                  </div>
                ))}
                {monthlyBreakdown.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No savings data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Savings by Vehicle Type */}
          <Card>
            <CardHeader>
              <CardTitle>Savings by Vehicle Type</CardTitle>
              <CardDescription>Cost savings breakdown by vehicle capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savingsByVehicle.map((vehicle) => (
                  <div key={vehicle.type} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{vehicle.type}</h3>
                      <Badge variant="outline" className="text-green-600">
                        {formatCurrency(vehicle.savings)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <p>Trips: {vehicle.trips}</p>
                      </div>
                      <div>
                        <p>Avg: {formatCurrency(vehicle.avgSavingsPerTrip)}</p>
                      </div>
                    </div>
                    <Progress 
                      value={(vehicle.savings / stats.totalSavings) * 100} 
                      className="h-2 mt-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Saving Route */}
        {stats.topSavingRoute.amount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                Top Saving Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Route</p>
                  <p className="text-lg font-medium">{stats.topSavingRoute.route}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.topSavingRoute.amount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}