// app/admin/statistics/optimization-rate/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Target, TrendingUp, Zap, Download, Loader2, Activity } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { authService } from "@/lib/auth-service"
import { formatCurrency } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface MonthlyOptimization {
  month: string
  total: number
  optimized: number
  rate: number
}

export default function OptimizationRatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    overallRate: 0,
    totalTrips: 0,
    optimizedTrips: 0,
    pendingOptimization: 0,
    confirmedTrips: 0,
    cancelledTrips: 0,
    targetRate: 75,
    improvementNeeded: 0,
    bestMonth: { month: '', rate: 0 },
    worstMonth: { month: '', rate: 0 }
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyOptimization[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([])

  useEffect(() => {
    loadOptimizationData()
  }, [])

  const loadOptimizationData = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const allTrips = await fabricService.getTrips()
      const optimizedTrips = allTrips.filter(t => t.status === 'optimized')
      const pendingTrips = allTrips.filter(t => t.status === 'pending')
      const confirmedTrips = allTrips.filter(t => t.status === 'confirmed')
      const cancelledTrips = allTrips.filter(t => t.status === 'cancelled')

      const overallRate = allTrips.length > 0 
        ? (optimizedTrips.length / allTrips.length) * 100 
        : 0

      // Monthly optimization breakdown
      const monthlyMap: { [key: string]: MonthlyOptimization } = {}
      allTrips.forEach(trip => {
        // Validate date before processing
        if (!trip.departureDate) return
        const date = new Date(trip.departureDate)
        if (isNaN(date.getTime())) return // Skip invalid dates

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            month: monthKey,
            total: 0,
            optimized: 0,
            rate: 0
          }
        }

        monthlyMap[monthKey].total += 1
        if (trip.status === 'optimized') {
          monthlyMap[monthKey].optimized += 1
        }
      })

      // Calculate rates
      Object.values(monthlyMap).forEach(month => {
        month.rate = month.total > 0 ? (month.optimized / month.total) * 100 : 0
      })

      const monthlyArray = Object.values(monthlyMap)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12)

      // Find best and worst months
      const sortedByRate = [...monthlyArray].sort((a, b) => b.rate - a.rate)
      const bestMonth = sortedByRate[0] || { month: 'N/A', rate: 0 }
      const worstMonth = sortedByRate[sortedByRate.length - 1] || { month: 'N/A', rate: 0 }

      // Helper function to safely calculate percentage
      const safePercentage = (part: number, total: number) =>
        total > 0 ? (part / total) * 100 : 0

      // Status breakdown - with safe division
      const statusData = [
        {
          status: 'Optimized',
          count: optimizedTrips.length,
          percentage: safePercentage(optimizedTrips.length, allTrips.length),
          color: 'bg-blue-800'
        },
        {
          status: 'Confirmed',
          count: confirmedTrips.length,
          percentage: safePercentage(confirmedTrips.length, allTrips.length),
          color: 'bg-green-500'
        },
        {
          status: 'Pending',
          count: pendingTrips.length,
          percentage: safePercentage(pendingTrips.length, allTrips.length),
          color: 'bg-yellow-500'
        },
        {
          status: 'Cancelled',
          count: cancelledTrips.length,
          percentage: safePercentage(cancelledTrips.length, allTrips.length),
          color: 'bg-red-500'
        }
      ]

      // Calculate trips that can be optimized (confirmed but not yet in optimization group)
      const pendingOptimizationTrips = confirmedTrips.filter(t => !t.optimizedGroupId)

      const targetRate = 75
      const improvementNeeded = Math.max(0, targetRate - overallRate)

      setStats({
        overallRate,
        totalTrips: allTrips.length,
        optimizedTrips: optimizedTrips.length,
        pendingOptimization: pendingOptimizationTrips.length, // Fixed: only count confirmed trips without optimization group
        confirmedTrips: confirmedTrips.length,
        cancelledTrips: cancelledTrips.length,
        targetRate,
        improvementNeeded,
        bestMonth,
        worstMonth
      })

      setMonthlyData(monthlyArray)
      setStatusBreakdown(statusData)
    } catch (error) {
      console.error('Error loading optimization data:', error)
      toast({
        title: "Error",
        description: "Failed to load optimization data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const csv = [
      ['Optimization Rate Report - ' + new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Overall Optimization Rate', stats.overallRate.toFixed(2) + '%'],
      ['Total Trips', stats.totalTrips],
      ['Optimized Trips', stats.optimizedTrips],
      ['Confirmed (Pending Optimization)', stats.pendingOptimization],
      ['Target Rate', stats.targetRate + '%'],
      ['Improvement Needed', stats.improvementNeeded.toFixed(2) + '%'],
      ['Best Month', stats.bestMonth.month + ' - ' + stats.bestMonth.rate.toFixed(2) + '%'],
      ['Worst Month', stats.worstMonth.month + ' - ' + stats.worstMonth.rate.toFixed(2) + '%'],
      [],
      ['Monthly Breakdown'],
      ['Month', 'Total Trips', 'Optimized', 'Rate %'],
      ...monthlyData.map(m => [
        m.month,
        m.total,
        m.optimized,
        m.rate.toFixed(2)
      ]),
      [],
      ['Status Breakdown'],
      ['Status', 'Count', 'Percentage'],
      ...statusBreakdown.map(s => [
        s.status,
        s.count,
        s.percentage.toFixed(2) + '%'
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `optimization-rate-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getRateColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRateBadge = (rate: number) => {
    if (rate >= 75) return { variant: 'default' as const, text: 'Excellent', color: 'bg-green-600' }
    if (rate >= 50) return { variant: 'secondary' as const, text: 'Good', color: 'bg-yellow-600' }
    if (rate >= 25) return { variant: 'outline' as const, text: 'Fair', color: 'bg-orange-600' }
    return { variant: 'destructive' as const, text: 'Poor', color: 'bg-red-600' }
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

      <div className="container mx-auto p-6 pb-8 space-y-4">
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
                <Target className="h-6 w-6 text-red-600" />
                Optimization Rate Analysis
              </h1>
              <p className="text-gray-500">Track and improve trip optimization performance</p>
            </div>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Main Optimization Card */}
        <Card className="border-l-4 border-l-red-600 bg-gradient-to-br from-red-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-red-600" />
                Overall Optimization Rate
              </span>
              <Badge {...getRateBadge(stats.overallRate)}>
                {getRateBadge(stats.overallRate).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Current Rate</span>
                <span className={`text-3xl font-bold ${getRateColor(stats.overallRate)}`}>
                  {stats.overallRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.overallRate} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span className="font-medium">Target: {stats.targetRate}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-2xl font-bold">{stats.totalTrips}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Optimized</p>
                <p className="text-2xl font-bold text-blue-800">{stats.optimizedTrips}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Pending Optimization</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingOptimization}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Improvement Needed</p>
                <p className="text-2xl font-bold text-red-600">{stats.improvementNeeded.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Improvement Alert */}
        {stats.improvementNeeded > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">Room for Improvement</h3>
                  <p className="text-sm text-red-700 mt-1">
                    To reach the target optimization rate of {stats.targetRate}%, you need to optimize <strong>{Math.max(0, Math.ceil((stats.targetRate * stats.totalTrips / 100) - stats.optimizedTrips))} more trips</strong>.
                    {stats.pendingOptimization > 0 && ` You currently have ${stats.pendingOptimization} confirmed trips ready for optimization.`}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-red-600 hover:bg-red-700"
                    onClick={() => router.push('/admin/dashboard')}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Optimize Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Optimization Trends</CardTitle>
              <CardDescription>Performance over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.map((month) => (
                  <div key={month.month} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{month.month}</span>
                      <Badge className={getRateColor(month.rate)}>
                        {month.rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={month.rate} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{month.optimized} optimized</span>
                      <span>{month.total} total trips</span>
                    </div>
                  </div>
                ))}
                {monthlyData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No monthly data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Status Distribution</CardTitle>
              <CardDescription>Breakdown of all trips by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusBreakdown.map((status) => (
                  <div key={status.status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{status.status}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold">{status.count}</span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({status.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${status.color}`}
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Best and Worst Months */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Best Month</p>
                  <p className="font-medium">{stats.bestMonth.month}</p>
                  <p className="text-lg font-bold text-green-600">
                    {stats.bestMonth.rate.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Needs Focus</p>
                  <p className="font-medium">{stats.worstMonth.month}</p>
                  <p className="text-lg font-bold text-red-600">
                    {stats.worstMonth.rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}