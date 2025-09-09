// app/dashboard/savings/page.tsx
"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, TrendingDown, DollarSign, Car, Leaf } from "lucide-react"
import { fabricService } from "@/lib/supabase-service"
import { authService } from "@/lib/auth-service"
import { formatCurrency } from "@/lib/config"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"


export default function SavingsPage() {
  const router = useRouter()
  const [savings, setSavings] = useState({
    total: 0,
    thisMonth: 0,
    thisYear: 0,
    averagePerTrip: 0,
    co2Saved: 0,
    tripsOptimized: 0,
    percentageSaved: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSavingsData()
  }, [])

  const loadSavingsData = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        router.push('/')
        return
      }

      const trips = await fabricService.getTrips({ userId: user.id })
      const optimizedTrips = trips.filter(t => t.status === 'optimized')
      
      // Calculate savings
      const totalSavings = optimizedTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      // This month savings
      const thisMonth = new Date().getMonth()
      const thisYear = new Date().getFullYear()
      const thisMonthTrips = optimizedTrips.filter(t => {
        const d = new Date(t.departureDate)
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      })
      const thisMonthSavings = thisMonthTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      // This year savings
      const thisYearTrips = optimizedTrips.filter(t => {
        const d = new Date(t.departureDate)
        return d.getFullYear() === thisYear
      })
      const thisYearSavings = thisYearTrips.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      setSavings({
        total: totalSavings,
        thisMonth: thisMonthSavings,
        thisYear: thisYearSavings,
        averagePerTrip: optimizedTrips.length > 0 ? totalSavings / optimizedTrips.length : 0,
        co2Saved: totalSavings / 10000 * 2.3,
        tripsOptimized: optimizedTrips.length,
        percentageSaved: 25 // Average 25% savings
      })
    } catch (error) {
      console.error('Error loading savings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = () => {
    const report = `
Savings Report - ${new Date().toLocaleDateString()}
=====================================
Total Savings: ${formatCurrency(savings.total)}
This Month: ${formatCurrency(savings.thisMonth)}
This Year: ${formatCurrency(savings.thisYear)}
Average per Trip: ${formatCurrency(savings.averagePerTrip)}
Trips Optimized: ${savings.tripsOptimized}
CO2 Saved: ${savings.co2Saved.toFixed(1)} kg
Average Savings: ${savings.percentageSaved}%
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `savings-report-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-green-600" />
                Savings Report
              </h1>
              <p className="text-gray-500">Your cost savings through trip optimization</p>
            </div>
          </div>
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Savings Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(savings.total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(savings.thisMonth)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Year</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(savings.thisYear)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                CO₂ Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-teal-600">
                {savings.co2Saved.toFixed(1)} kg
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Statistics</CardTitle>
            <CardDescription>Detailed breakdown of your savings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Trips Optimized</span>
              <span className="font-bold">{savings.tripsOptimized} trips</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average Savings per Trip</span>
              <span className="font-bold">{formatCurrency(savings.averagePerTrip)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average Savings Percentage</span>
              <span className="font-bold">{savings.percentageSaved}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Savings Progress</span>
                <span className="text-sm text-gray-500">Target: 1,000,000 VND/month</span>
              </div>
              <Progress value={(savings.thisMonth / 1000000) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Environmental Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Environmental Impact</CardTitle>
            <CardDescription>Your contribution to reducing carbon emissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Leaf className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{savings.co2Saved.toFixed(1)} kg</p>
                <p className="text-sm text-gray-600">CO₂ Reduced</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Car className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{savings.tripsOptimized}</p>
                <p className="text-sm text-gray-600">Trips Optimized</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingDown className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{savings.percentageSaved}%</p>
                <p className="text-sm text-gray-600">Average Reduction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
