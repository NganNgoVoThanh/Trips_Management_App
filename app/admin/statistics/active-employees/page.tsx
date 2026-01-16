// app/admin/statistics/active-employees/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Users, TrendingUp, Award, Download, Loader2, Mail, Building2 } from "lucide-react"
import { Trip } from "@/lib/fabric-client"
import { useSession } from "next-auth/react"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface EmployeeStats {
  userId: string
  name: string
  email: string
  totalTrips: number
  optimizedTrips: number
  pendingTrips: number
  totalCost: number
  savings: number
  optimizationRate: number
  mostFrequentRoute: string
  lastTripDate: string
}

export default function ActiveEmployeesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeStats[]>([])
  const [stats, setStats] = useState({
    totalActive: 0,
    newThisMonth: 0,
    avgTripsPerEmployee: 0,
    topUser: { name: '', trips: 0 },
    mostOptimized: { name: '', rate: 0 },
    totalEngagement: 0
  })
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'trips' | 'savings' | 'rate'>('trips')

  useEffect(() => {
    loadEmployeeData()
  }, [])

  const loadEmployeeData = async () => {
    try {
      const { data: session, status } = useSession()
      if (status === 'loading') return

      const user = session?.user
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const response = await fetch('/api/trips')
      if (!response.ok) {
        throw new Error('Failed to load trips')
     }
     const allTrips = await response.json()
      
      // Group trips by user
      const userMap: { [key: string]: EmployeeStats } = {}
      
      allTrips.forEach((trip: Trip) => {
        if (!userMap[trip.userId]) {
          userMap[trip.userId] = {
            userId: trip.userId,
            name: trip.userName,
            email: trip.userEmail,
            totalTrips: 0,
            optimizedTrips: 0,
            pendingTrips: 0,
            totalCost: 0,
            savings: 0,
            optimizationRate: 0,
            mostFrequentRoute: '',
            lastTripDate: ''
          }
        }
        
        const userStats = userMap[trip.userId]
        userStats.totalTrips += 1
        
        if (trip.status === 'optimized') {
          userStats.optimizedTrips += 1
          // ✅ FIX: Only count savings if we have both estimated and actual cost
          if (trip.estimatedCost && trip.actualCost) {
            const savings = trip.estimatedCost - trip.actualCost
            if (savings > 0) {
              userStats.savings += savings
            }
          }
        }
        
        if (trip.status === 'pending_approval' || trip.status === 'pending_urgent') {
          userStats.pendingTrips += 1
        }
        
        if (trip.estimatedCost) {
          userStats.totalCost += (trip.actualCost || trip.estimatedCost)
        }
        
        // Track last trip date
        if (!userStats.lastTripDate || trip.departureDate > userStats.lastTripDate) {
          userStats.lastTripDate = trip.departureDate
        }
      })
      
      // Calculate optimization rate and most frequent route for each user
      const employeeList = Object.values(userMap).map(emp => {
        emp.optimizationRate = emp.totalTrips > 0 ? (emp.optimizedTrips / emp.totalTrips) * 100 : 0
        
        // Find most frequent route
        const userTrips = allTrips.filter((t: Trip) => t.userId === emp.userId)
        const routeCount: { [key: string]: number } = {}
        userTrips.forEach((trip: Trip) => {
          const route = `${getLocationName(trip.departureLocation)} → ${getLocationName(trip.destination)}`
          routeCount[route] = (routeCount[route] || 0) + 1
        })
        
        const topRoute = Object.entries(routeCount)
          .sort((a, b) => b[1] - a[1])[0]
        emp.mostFrequentRoute = topRoute ? `${topRoute[0]} (${topRoute[1]}x)` : 'N/A'
        
        return emp
      })

      // Calculate stats
      const now = new Date()
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
      const newThisMonth = employeeList.filter(emp => {
        const lastTrip = new Date(emp.lastTripDate)
        return lastTrip >= monthAgo
      }).length

      const topUser = [...employeeList].sort((a, b) => b.totalTrips - a.totalTrips)[0] || { name: 'N/A', totalTrips: 0 }
      const mostOptimized = [...employeeList].sort((a, b) => b.optimizationRate - a.optimizationRate)[0] || { name: 'N/A', optimizationRate: 0 }
      
      const totalTrips = employeeList.reduce((sum, emp) => sum + emp.totalTrips, 0)
      const avgTripsPerEmployee = employeeList.length > 0 ? totalTrips / employeeList.length : 0

      setStats({
        totalActive: employeeList.length,
        newThisMonth,
        avgTripsPerEmployee,
        topUser: { name: topUser.name, trips: topUser.totalTrips },
        mostOptimized: { name: mostOptimized.name, rate: mostOptimized.optimizationRate },
        totalEngagement: (newThisMonth / employeeList.length) * 100 || 0
      })

      setEmployees(employeeList)
    } catch (error) {
      console.error('Error loading employee data:', error)
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getFilteredEmployees = () => {
    let filtered = [...employees]
    
    // Filter by activity
    if (filterStatus === 'active') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(emp => new Date(emp.lastTripDate) >= monthAgo)
    } else if (filterStatus === 'inactive') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(emp => new Date(emp.lastTripDate) < monthAgo)
    }
    
    // Sort
    if (sortBy === 'trips') {
      filtered.sort((a, b) => b.totalTrips - a.totalTrips)
    } else if (sortBy === 'savings') {
      filtered.sort((a, b) => b.savings - a.savings)
    } else if (sortBy === 'rate') {
      filtered.sort((a, b) => b.optimizationRate - a.optimizationRate)
    }
    
    return filtered
  }

  const exportData = () => {
    const filteredData = getFilteredEmployees()
    const csv = [
      ['Active Employees Report - ' + new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Total Active Employees', stats.totalActive],
      ['New This Month', stats.newThisMonth],
      ['Average Trips per Employee', stats.avgTripsPerEmployee.toFixed(2)],
      ['Top User', stats.topUser.name + ' - ' + stats.topUser.trips + ' trips'],
      ['Most Optimized', stats.mostOptimized.name + ' - ' + stats.mostOptimized.rate.toFixed(1) + '%'],
      [],
      ['Employee Details'],
      ['Name', 'Email', 'Total Trips', 'Optimized', 'Pending', 'Optimization Rate %', 'Total Cost', 'Savings', 'Most Frequent Route', 'Last Trip'],
      ...filteredData.map(emp => [
        emp.name,
        emp.email,
        emp.totalTrips,
        emp.optimizedTrips,
        emp.pendingTrips,
        emp.optimizationRate.toFixed(2),
        emp.totalCost,
        emp.savings,
        emp.mostFrequentRoute,
        new Date(emp.lastTripDate).toLocaleDateString('vi-VN')
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `active-employees-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getActivityBadge = (lastTripDate: string) => {
    const lastTrip = new Date(lastTripDate)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - lastTrip.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 7) return { variant: 'default' as const, text: 'Very Active', color: 'bg-green-500' }
    if (daysDiff <= 30) return { variant: 'secondary' as const, text: 'Active', color: 'bg-blue-500' }
    if (daysDiff <= 90) return { variant: 'outline' as const, text: 'Moderate', color: 'bg-yellow-500' }
    return { variant: 'destructive' as const, text: 'Inactive', color: 'bg-red-500' }
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

  const filteredEmployees = getFilteredEmployees()

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
                <Users className="h-6 w-6 text-purple-600" />
                Active Employees Analysis
              </h1>
              <p className="text-gray-500">Monitor employee engagement and trip patterns</p>
            </div>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Active Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.totalActive}</p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-600">+{stats.newThisMonth}</span>
                <span className="ml-1">new this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Trips/Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgTripsPerEmployee.toFixed(1)}</p>
              <Progress value={(stats.avgTripsPerEmployee / 10) * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top User</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium truncate">{stats.topUser.name}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.topUser.trips} trips</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Engagement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.totalEngagement.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Active this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Activity</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                  >
                    All ({employees.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('active')}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('inactive')}
                  >
                    Inactive
                  </Button>
                </div>
              </div>

              <div className="border-l pl-4">
                <label className="text-sm font-medium mb-2 block">Sort by</label>
                <select 
                  className="px-3 py-1.5 border rounded-md text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="trips">Total Trips</option>
                  <option value="savings">Total Savings</option>
                  <option value="rate">Optimization Rate</option>
                </select>
              </div>

              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Top 5 Most Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredEmployees.slice(0, 5).map((emp, index) => (
                  <div key={emp.userId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">
                      {emp.totalTrips} trips
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Top 5 Most Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...filteredEmployees].sort((a, b) => b.savings - a.savings).slice(0, 5).map((emp, index) => (
                  <div key={emp.userId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.optimizationRate.toFixed(1)}% optimized</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      {formatCurrency(emp.savings)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>Detailed employee trip statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredEmployees.map((emp) => (
                <div key={emp.userId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{emp.name}</h3>
                        <Badge {...getActivityBadge(emp.lastTripDate)}>
                          {getActivityBadge(emp.lastTripDate).text}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                        <Mail className="h-3 w-3" />
                        <span>{emp.email}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Total Trips</p>
                          <p className="font-semibold">{emp.totalTrips}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Optimized</p>
                          <p className="font-semibold text-green-600">{emp.optimizedTrips}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Optimization Rate</p>
                          <p className="font-semibold">{emp.optimizationRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Savings</p>
                          <p className="font-semibold text-green-600">{formatCurrency(emp.savings)}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                          <div>
                            <p className="text-gray-500">Most Frequent Route</p>
                            <p className="font-medium">{emp.mostFrequentRoute}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Last Trip</p>
                            <p className="font-medium">{new Date(emp.lastTripDate).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No employees found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}