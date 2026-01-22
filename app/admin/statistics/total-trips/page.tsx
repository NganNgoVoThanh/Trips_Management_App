// app/admin/statistics/total-trips/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Car, TrendingUp, Calendar, MapPin, Download, Filter, Loader2 } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export default function TotalTripsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    growthRate: 0,
    byStatus: {} as Record<string, number>,
    byDestination: {} as Record<string, number>,
    avgPerMonth: 0
  })

  useEffect(() => {
    // Only run when status is not loading
    if (status !== 'loading') {
      loadTripsData()
    }
  }, [status]) // Removed session from deps to prevent re-render loops

  useEffect(() => {
    filterTrips()
  }, [trips, dateFilter, statusFilter, departmentFilter])

  const loadTripsData = async () => {
    try {
      // Wait for session to finish loading
      if (status === 'loading') {
        return
      }

      // Only redirect if authenticated but NOT admin (user shouldn't be here)
      if (status === 'authenticated' && session?.user && session.user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // If unauthenticated, let Next.js handle redirect via middleware
      if (status === 'unauthenticated') {
        return
      }

      const allTrips = await fabricService.getTrips()
      
      // Calculate statistics
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
      
      const thisMonthTrips = allTrips.filter(t => {
        const d = new Date(t.departureDate)
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      })
      
      const lastMonthTrips = allTrips.filter(t => {
        const d = new Date(t.departureDate)
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
      })
      
      // Calculate growth rate
      const growthRate = lastMonthTrips.length > 0 
        ? ((thisMonthTrips.length - lastMonthTrips.length) / lastMonthTrips.length) * 100
        : 0
      
      // Group by status
      const byStatus = allTrips.reduce((acc, trip) => {
        acc[trip.status] = (acc[trip.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Group by destination
      const byDestination = allTrips.reduce((acc, trip) => {
        const dest = getLocationName(trip.destination)
        acc[dest] = (acc[dest] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Calculate average per month
      const monthsWithTrips = new Set(allTrips.map(t => {
        const d = new Date(t.departureDate)
        return `${d.getFullYear()}-${d.getMonth()}`
      })).size
      
      setStats({
        total: allTrips.length,
        thisMonth: thisMonthTrips.length,
        lastMonth: lastMonthTrips.length,
        growthRate,
        byStatus,
        byDestination,
        avgPerMonth: monthsWithTrips > 0 ? Math.round(allTrips.length / monthsWithTrips) : 0
      })
      
      setTrips(allTrips)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast({
        title: "Error",
        description: "Failed to load trips data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterTrips = () => {
    let filtered = [...trips]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (dateFilter) {
      // Compare date portion only, handling both YYYY-MM-DD format and ISO date strings
      filtered = filtered.filter(t => {
        const tripDate = t.departureDate.split('T')[0] // Get YYYY-MM-DD portion
        return tripDate === dateFilter
      })
    }

    setFilteredTrips(filtered)
  }

  const exportData = () => {
    const csv = [
      ['Trip Statistics Report - ' + new Date().toLocaleDateString()],
      [],
      ['Total Trips', stats.total],
      ['This Month', stats.thisMonth],
      ['Last Month', stats.lastMonth],
      ['Growth Rate', stats.growthRate.toFixed(2) + '%'],
      ['Average per Month', stats.avgPerMonth],
      [],
      ['By Status'],
      ...Object.entries(stats.byStatus).map(([status, count]) => [status, count]),
      [],
      ['By Destination'],
      ...Object.entries(stats.byDestination).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([dest, count]) => [dest, count]),
      [],
      ['Trip Details'],
      ['ID', 'Employee', 'From', 'To', 'Date', 'Status', 'Cost'],
      ...filteredTrips.map(t => [
        t.id.slice(0, 8),
        t.userName,
        getLocationName(t.departureLocation),
        getLocationName(t.destination),
        new Date(t.departureDate).toLocaleDateString('vi-VN'),
        t.status,
        t.estimatedCost || 0
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trips-statistics-${new Date().toISOString().split('T')[0]}.csv`
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
                <Car className="h-6 w-6 text-red-600" />
                Total Trips Statistics
              </h1>
              <p className="text-gray-500">Comprehensive analysis of all business trips</p>
            </div>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-red-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-600">+{stats.growthRate.toFixed(1)}%</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
              <Progress value={(stats.thisMonth / stats.avgPerMonth) * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.lastMonth}</p>
              <p className="text-xs text-muted-foreground">Completed trips</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg/Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgPerMonth}</p>
              <p className="text-xs text-muted-foreground">Average trips</p>
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
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Badge variant="outline" className={
                    status === 'optimized' ? 'border-green-400 text-green-700' :
                    status === 'approved' || status === 'approved_solo' || status === 'auto_approved' ? 'border-blue-400 text-blue-700' :
                    status === 'pending_approval' || status === 'pending_urgent' ? 'border-yellow-400 text-yellow-700' :
                    'border-red-400 text-red-700'
                  }>
                    {status}
                  </Badge>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-gray-500">
                    {((count / stats.total) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Destinations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
            <CardDescription>Most frequently visited locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byDestination)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([dest, count], index) => (
                  <div key={dest} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{dest}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">{count}</span>
                      <span className="text-sm text-gray-500 ml-1">trips</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="optimized">Optimized</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                className="w-[180px]"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />

              {(statusFilter !== 'all' || dateFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("all")
                    setDateFilter("")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {filteredTrips.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">
                Showing {filteredTrips.length} of {trips.length} trips
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trips List */}
        <Card>
          <CardHeader>
            <CardTitle>All Trips</CardTitle>
            <CardDescription>Detailed list of all business trips</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trips found matching the filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{trip.userName}</span>
                        <Badge variant="outline" className={
                          trip.status === 'optimized' ? 'border-green-400 text-green-700' :
                          trip.status === 'approved' || trip.status === 'approved_solo' || trip.status === 'auto_approved' ? 'border-blue-400 text-blue-700' :
                          trip.status === 'pending_approval' || trip.status === 'pending_urgent' ? 'border-yellow-400 text-yellow-700' :
                          'border-red-400 text-red-700'
                        }>
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{getLocationName(trip.departureLocation)}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium">{getLocationName(trip.destination)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(trip.departureDate).toLocaleDateString('vi-VN')}</span>
                          <span className="text-gray-400">at {trip.departureTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {trip.estimatedCost && (
                        <div className="font-semibold text-lg">
                          {formatCurrency(trip.estimatedCost)}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {trip.vehicleType || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}