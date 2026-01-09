"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  Users,
  Car,
  TrendingDown,
  Calendar,
  DollarSign,
  Activity,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Mail
} from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName, config } from "@/lib/config"
import { formatDateTime, formatDate} from "@/lib/utils" // ✅ THÊM import formatDateTime
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { AdminHeader } from "@/components/admin/header"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { emailService } from "@/lib/email-service"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateTripForUser } from "@/components/admin/create-trip-for-user"
import { UserPlus } from "lucide-react"

export default function ManagementDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showTripDetails, setShowTripDetails] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [stats, setStats] = useState({
    totalTrips: 0,
    pendingTrips: 0,
    optimizedTrips: 0,
    totalSavings: 0,
    monthlyTrips: 0,
    activeEmployees: 0,
    averageSavings: 0,
    optimizationRate: 0
  })

  useEffect(() => {
    checkUserRole()
    loadDashboardData()
  }, [])

  useEffect(() => {
    filterTripsData()
  }, [trips, searchTerm, statusFilter, locationFilter, dateFilter])

  const checkUserRole = () => {
    // Check NextAuth session
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
  }

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const allTrips = await fabricService.getTrips()
      setTrips(allTrips)
      calculateStats(allTrips)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (trips: Trip[]) => {
    const totalTrips = trips.length

    // ✅ Fixed: Count all pending statuses correctly
    const pendingTrips = trips.filter(t =>
      t.status === 'pending_approval' ||
      t.status === 'pending_urgent' ||
      t.status === 'pending'
    ).length

    // Count optimized trips
    const optimizedTrips = trips.filter(t => t.status === 'optimized').length

    // ✅ Fixed: Only calculate savings when actualCost exists
    const totalSavings = trips.reduce((sum, t) => {
      // Only count trips with both estimated and actual costs
      if (t.status === 'optimized' && t.estimatedCost && t.actualCost) {
        const savings = t.estimatedCost - t.actualCost
        // Only add positive savings (sanity check)
        return sum + (savings > 0 ? savings : 0)
      }
      return sum
    }, 0)

    // Current month trips
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyTrips = trips.filter(t => {
      try {
        const date = new Date(t.departureDate)
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      } catch {
        return false
      }
    }).length

    // Count unique employees with trips
    const uniqueEmployees = new Set(trips.map(t => t.userId)).size

    // ✅ Fixed: Calculate average savings only from trips with actual costs
    const tripsWithActualSavings = trips.filter(t =>
      t.status === 'optimized' && t.estimatedCost && t.actualCost
    ).length
    const averageSavings = tripsWithActualSavings > 0 ? totalSavings / tripsWithActualSavings : 0

    // ✅ Fixed: Calculate optimization rate from approved/completed trips only
    const completedTrips = trips.filter(t =>
      t.status === 'optimized' ||
      t.status === 'approved_solo' ||
      t.status === 'approved' ||
      t.status === 'auto_approved' ||
      t.status === 'confirmed' // Legacy approved status
    ).length
    const optimizationRate = completedTrips > 0 ? (optimizedTrips / completedTrips) * 100 : 0

    setStats({
      totalTrips,
      pendingTrips,
      optimizedTrips,
      totalSavings,
      monthlyTrips,
      activeEmployees: uniqueEmployees,
      averageSavings,
      optimizationRate
    })
  }

  const filterTripsData = () => {
    let filtered = [...trips]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(t =>
        t.departureLocation === locationFilter || t.destination === locationFilter
      )
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter(t => t.departureDate === today)
    } else if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(t => new Date(t.departureDate) >= weekAgo)
    } else if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(t => new Date(t.departureDate) >= monthAgo)
    }

    setFilteredTrips(filtered)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    toast({
      title: "Dashboard Refreshed",
      description: "Data has been updated successfully"
    })
    setIsRefreshing(false)
  }

  const handleViewTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowTripDetails(true)
  }

  const handleApproveTrip = async (tripId: string) => {
    try {
      // Check if trip can be optimized
      const { checkOptimizationPotential } = await import('@/lib/optimization-helper');
      const canOptimize = await checkOptimizationPotential(tripId);

      await fabricService.updateTrip(tripId, {
        status: canOptimize ? 'approved' : 'approved_solo'
      })
      
      await loadDashboardData()
      
      toast({
        title: "Trip Approved",
        description: "Trip has been confirmed successfully"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve trip",
        variant: "destructive"
      })
    }
  }

  const [exporting, setExporting] = useState(false)

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/export-trips")

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to export")
      }

      // Download the file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `trips_export_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export Successful",
        description: "Trip data has been exported to Excel"
      })
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <AdminHeader />

      <div className="container mx-auto p-6 space-y-4 flex-1">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
            <p className="text-gray-500 mt-1">Comprehensive trip management and analytics</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-gray-500 mt-1">All registered trips</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingTrips}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Optimization Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.optimizationRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Trips optimized</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSavings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Cost reduction</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">All Trips</TabsTrigger>
            <TabsTrigger value="create-trip">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Trip
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Trips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    Recent Trips
                  </CardTitle>
                  <CardDescription>Latest trip registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trips.slice(0, 5).map((trip) => (
                      <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handleViewTrip(trip)}>
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            trip.status === 'optimized' ? 'bg-blue-400' :
                            trip.status === 'approved' || trip.status === 'approved_solo' || trip.status === 'auto_approved' ? 'bg-green-400' :
                            trip.status === 'pending_approval' || trip.status === 'pending_urgent' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{trip.userName}</p>
                            <p className="text-xs text-gray-500">
                              {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDateTime(trip.createdAt)}</p>
                          <Badge variant="outline" className="text-xs">
                            {trip.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    Pending Actions
                  </CardTitle>
                  <CardDescription>Items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Pending trip approvals</span>
                      </div>
                      <Badge className="bg-yellow-600">{stats.pendingTrips}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Trips ready for optimization</span>
                      </div>
                      <Badge className="bg-blue-600">
                        {trips.filter(t => t.status === 'approved' && !t.optimizedGroupId).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Optimized this week</span>
                      </div>
                      <Badge className="bg-green-600">
                        {trips.filter(t => {
                          const weekAgo = new Date()
                          weekAgo.setDate(weekAgo.getDate() - 7)
                          return t.status === 'optimized' && new Date(t.updatedAt) > weekAgo
                        }).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Create Trip Tab */}
          <TabsContent value="create-trip" className="space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <UserPlus className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Create Trip for Employee</h2>
                  <p className="text-red-100 mt-1">
                    Register a business trip on behalf of any employee in the system
                  </p>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Select Employee</p>
                      <p className="text-xs text-blue-700">Choose from all users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600 text-white p-2 rounded-lg">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Trip Details</p>
                      <p className="text-xs text-green-700">Auto-calculate costs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-600 text-white p-2 rounded-lg">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Auto Approval</p>
                      <p className="text-xs text-purple-700">Email notification sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Create Trip Form */}
            <CreateTripForUser />
          </TabsContent>

          {/* All Trips Tab */}
          <TabsContent value="trips" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Trips Management</CardTitle>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search trips..." 
                      className="w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="optimized">Optimized</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewTrip(trip)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${
                          trip.status === 'optimized' ? 'bg-blue-500' :
                          trip.status === 'approved' || trip.status === 'approved_solo' || trip.status === 'auto_approved' ? 'bg-green-500' :
                          trip.status === 'pending_approval' || trip.status === 'pending_urgent' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{trip.userName}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Departure: {formatDate(trip.departureDate)} at {trip.departureTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant="outline">{trip.status}</Badge>
                          {trip.estimatedCost && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatCurrency(trip.estimatedCost)}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">This Month</span>
                    <span className="text-lg font-bold">{stats.monthlyTrips} trips</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Active Employees</span>
                    <span className="text-lg font-bold">{stats.activeEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Average Savings</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(stats.averageSavings)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Optimization Rate</span>
                      <span className="text-sm font-medium">{stats.optimizationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.optimizationRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Pending Rate</span>
                      <span className="text-sm font-medium">
                        {stats.totalTrips > 0 ? ((stats.pendingTrips / stats.totalTrips) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalTrips > 0 ? (stats.pendingTrips / stats.totalTrips) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Activity Table */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Activity</CardTitle>
                <CardDescription>Trip activity by employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Name</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Email</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Total Trips</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Optimized</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Savings</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Last Trip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(trips.map(t => t.userId))).map(userId => {
                        const userTrips = trips.filter(t => t.userId === userId)
                        const user = userTrips[0]
                        const optimized = userTrips.filter(t => t.status === 'optimized').length
                        // ✅ Fixed: Only calculate savings from actual costs
                        const savings = userTrips.reduce((sum, t) => {
                          if (t.status === 'optimized' && t.estimatedCost && t.actualCost) {
                            const savingsAmount = t.estimatedCost - t.actualCost
                            return sum + (savingsAmount > 0 ? savingsAmount : 0)
                          }
                          return sum
                        }, 0)
                        
                        return (
                          <tr key={userId} className="border-b hover:bg-gray-50">
                            <td className="p-3">{user.userName}</td>
                            <td className="p-3">{user.userEmail}</td>
                            <td className="p-3">{userTrips.length}</td>
                            <td className="p-3">{optimized}</td>
                            <td className="p-3 text-green-600">{formatCurrency(savings)}</td>
                            <td className="p-3">{new Date(userTrips[userTrips.length - 1].departureDate).toLocaleDateString('vi-VN')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trip Details Dialog */}
        <Dialog open={showTripDetails} onOpenChange={setShowTripDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Trip Details</DialogTitle>
              <DialogDescription>
                Complete information about this trip
              </DialogDescription>
            </DialogHeader>
            {selectedTrip && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Employee</Label>
                    <p className="font-medium">{selectedTrip.userName}</p>
                    <p className="text-sm text-gray-500">{selectedTrip.userEmail}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <Badge className={
                      selectedTrip.status === 'optimized' ? 'bg-blue-100 text-blue-700' :
                      selectedTrip.status === 'approved' || selectedTrip.status === 'approved_solo' || selectedTrip.status === 'auto_approved' ? 'bg-green-100 text-green-700' :
                      selectedTrip.status === 'pending_approval' || selectedTrip.status === 'pending_urgent' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {selectedTrip.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">From</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationName(selectedTrip.departureLocation)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">To</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationName(selectedTrip.destination)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Departure</Label>
                    <p className="font-medium">
                      {new Date(selectedTrip.departureDate).toLocaleDateString('vi-VN')} at {selectedTrip.departureTime}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Return</Label>
                    <p className="font-medium">
                      {new Date(selectedTrip.returnDate).toLocaleDateString('vi-VN')} at {selectedTrip.returnTime}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Vehicle Type</Label>
                    <p className="font-medium">
                      {selectedTrip.vehicleType && config.vehicles[selectedTrip.vehicleType as keyof typeof config.vehicles]?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Estimated Cost</Label>
                    <p className="font-medium text-green-600">
                      {formatCurrency(selectedTrip.estimatedCost || 0)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">Trip ID</Label>
                  <p className="font-mono text-sm">{selectedTrip.id}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTripDetails(false)}>
                Close
              </Button>
              {(selectedTrip?.status === 'pending_approval' || selectedTrip?.status === 'pending_urgent') && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleApproveTrip(selectedTrip.id)
                    setShowTripDetails(false)
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Trip
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}