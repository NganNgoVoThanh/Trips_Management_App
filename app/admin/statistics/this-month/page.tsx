// app/admin/statistics/this-month/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Calendar, TrendingUp, MapPin, Download, Loader2, Clock, DollarSign } from "lucide-react"
import { Trip } from "@/lib/fabric-client"
import { authService } from "@/lib/auth-service"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { formatDateTime } from "@/lib/utils" // ✅ THÊM import formatDateTime

interface DayStats {
  day: number
  trips: number
  optimized: number
}

export default function ThisMonthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrips: 0,
    lastMonthTrips: 0,
    growthRate: 0,
    optimized: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    totalCost: 0,
    totalSavings: 0,
    avgTripsPerDay: 0,
    peakDay: { day: 0, trips: 0 },
    topRoute: { route: '', count: 0 },
    uniqueEmployees: 0
  })
  const [monthlyTrips, setMonthlyTrips] = useState<Trip[]>([])
  const [dailyStats, setDailyStats] = useState<DayStats[]>([])
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([])

  useEffect(() => {
    loadMonthlyData()
  }, [])

  const loadMonthlyData = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const response = await fetch('/api/trips')
      if (!response.ok) {
        throw new Error('Failed to load trips')
      }
      const allTrips = await response.json()
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      // This month's trips
      const thisMonthTrips = allTrips.filter((t: Trip) => {
        const tripDate = new Date(t.departureDate)
        return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear
      })

      // Last month's trips
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const lastMonthTrips = allTrips.filter((t: Trip) => {
        const tripDate = new Date(t.departureDate)
        return tripDate.getMonth() === lastMonth && tripDate.getFullYear() === lastMonthYear
      })

      // Calculate growth rate
      const growthRate = lastMonthTrips.length > 0
        ? ((thisMonthTrips.length - lastMonthTrips.length) / lastMonthTrips.length) * 100
        : 0

      // Status breakdown
      const optimized = thisMonthTrips.filter((t: Trip) => t.status === 'optimized')
      const pending = thisMonthTrips.filter((t: Trip) => t.status === 'pending')
      const confirmed = thisMonthTrips.filter((t: Trip) => t.status === 'confirmed')
      const cancelled = thisMonthTrips.filter((t: Trip) => t.status === 'cancelled')

      // Calculate costs
      const totalCost = thisMonthTrips.reduce((sum: number, t: Trip) => sum + (t.actualCost || t.estimatedCost || 0), 0)
      const totalSavings = optimized.reduce((sum: number, trip: Trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)

      // Daily breakdown
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      const dailyMap: { [key: number]: DayStats } = {}
      
      for (let i = 1; i <= daysInMonth; i++) {
        dailyMap[i] = { day: i, trips: 0, optimized: 0 }
      }

      thisMonthTrips.forEach((trip: Trip) => {
        const day = new Date(trip.departureDate).getDate()
        if (dailyMap[day]) {
          dailyMap[day].trips += 1
          if (trip.status === 'optimized') {
            dailyMap[day].optimized += 1
          }
        }
      })

      const dailyArray = Object.values(dailyMap)
      const peakDay = [...dailyArray].sort((a, b) => b.trips - a.trips)[0] || { day: 0, trips: 0 }

      // Route analysis
      const routeCount: { [key: string]: number } = {}
      thisMonthTrips.forEach((trip: Trip) => {
        const route = `${getLocationName(trip.departureLocation)} → ${getLocationName(trip.destination)}`
        routeCount[route] = (routeCount[route] || 0) + 1
      })
      const topRoute = Object.entries(routeCount).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0]

      // Unique employees
      const uniqueEmployees = new Set(thisMonthTrips.map((t: Trip) => t.userId)).size

      // Average trips per day
      const avgTripsPerDay = dailyArray.length > 0 
        ? thisMonthTrips.length / now.getDate() 
        : 0

      // Upcoming trips (rest of the month)
      const upcoming = thisMonthTrips.filter((t: Trip) => {
        const tripDate = new Date(t.departureDate)
        return tripDate >= now && t.status !== 'cancelled'
      }).sort((a: Trip, b: Trip) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())

      setStats({
        totalTrips: thisMonthTrips.length,
        lastMonthTrips: lastMonthTrips.length,
        growthRate,
        optimized: optimized.length,
        pending: pending.length,
        confirmed: confirmed.length,
        cancelled: cancelled.length,
        totalCost,
        totalSavings,
        avgTripsPerDay,
        peakDay,
        topRoute: { route: topRoute[0], count: topRoute[1] },
        uniqueEmployees
      })

      setMonthlyTrips(thisMonthTrips)
      setDailyStats(dailyArray)
      setUpcomingTrips(upcoming.slice(0, 10))
    } catch (error) {
      console.error('Error loading monthly data:', error)
      toast({
        title: "Error",
        description: "Failed to load monthly data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const csv = [
      ['This Month Report - ' + new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Total Trips This Month', stats.totalTrips],
      ['Last Month', stats.lastMonthTrips],
      ['Growth Rate', stats.growthRate.toFixed(2) + '%'],
      ['Optimized', stats.optimized],
      ['Pending', stats.pending],
      ['Confirmed', stats.confirmed],
      ['Cancelled', stats.cancelled],
      ['Total Cost', formatCurrency(stats.totalCost)],
      ['Total Savings', formatCurrency(stats.totalSavings)],
      ['Average Trips/Day', stats.avgTripsPerDay.toFixed(2)],
      ['Peak Day', `Day ${stats.peakDay.day} - ${stats.peakDay.trips} trips`],
      ['Top Route', `${stats.topRoute.route} - ${stats.topRoute.count} trips`],
      ['Unique Employees', stats.uniqueEmployees],
      [],
      ['Daily Breakdown'],
      ['Day', 'Total Trips', 'Optimized'],
      ...dailyStats.map(d => [d.day, d.trips, d.optimized]),
      [],
      ['Trip Details'],
      ['ID', 'Employee', 'From', 'To', 'Date', 'Status', 'Cost'],
      ...monthlyTrips.map((t: Trip) => [
        t.id.slice(0, 8),
        t.userName,
        getLocationName(t.departureLocation),
        getLocationName(t.destination),
        t.departureDate,
        t.status,
        t.actualCost || t.estimatedCost || 0
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `this-month-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getMonthName = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[new Date().getMonth()]
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
                <Calendar className="h-6 w-6 text-orange-600" />
                {getMonthName()} {new Date().getFullYear()} Overview
              </h1>
              <p className="text-gray-500">Current month performance and activity</p>
            </div>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Main Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-orange-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalTrips}</p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className={`mr-1 h-3 w-3 ${stats.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
                </span>
                <span className="ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Trips/Day</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgTripsPerDay.toFixed(1)}</p>
              <Progress value={(stats.avgTripsPerDay / 10) * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p>
              <p className="text-xs text-green-600 mt-1">Saved {formatCurrency(stats.totalSavings)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Unique Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{stats.uniqueEmployees}</p>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <Badge className="bg-green-600 mb-2">Optimized</Badge>
                <p className="text-3xl font-bold text-green-600">{stats.optimized}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {((stats.optimized / stats.totalTrips) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Badge className="bg-blue-600 mb-2">Confirmed</Badge>
                <p className="text-3xl font-bold text-blue-600">{stats.confirmed}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {((stats.confirmed / stats.totalTrips) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <Badge className="bg-yellow-600 mb-2">Pending</Badge>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {((stats.pending / stats.totalTrips) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <Badge className="bg-red-600 mb-2">Cancelled</Badge>
                <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {((stats.cancelled / stats.totalTrips) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Peak Day & Top Route */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium text-orange-900">Peak Day</h4>
                </div>
                <p className="text-2xl font-bold text-orange-600">Day {stats.peakDay.day}</p>
                <p className="text-sm text-gray-600">{stats.peakDay.trips} trips scheduled</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Most Popular Route</h4>
                </div>
                <p className="text-sm font-medium text-blue-900">{stats.topRoute.route}</p>
                <p className="text-sm text-gray-600">{stats.topRoute.count} trips</p>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Upcoming Trips
              </CardTitle>
              <CardDescription>Next scheduled trips this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {upcomingTrips.map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{trip.userName}</p>
                      <p className="text-xs text-gray-500">
                        {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatDateTime(trip.createdAt)}</p>
                      <Badge variant="outline" className="text-xs">
                        {trip.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {upcomingTrips.length === 0 && (
                  <p className="text-center py-6 text-gray-500 text-sm">No upcoming trips</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Trips scheduled by day of the month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {dailyStats.map((day) => (
                <div 
                  key={day.day} 
                  className={`text-center p-2 rounded border ${
                    day.trips > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500">Day {day.day}</p>
                  <p className="text-lg font-bold">{day.trips}</p>
                  {day.optimized > 0 && (
                    <p className="text-xs text-green-600">{day.optimized} opt</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}