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
  Settings,
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
import { fabricService, Trip } from "@/lib/supabase-service"
import { formatCurrency, getLocationName, config } from "@/lib/config"
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
import { DashboardHeader } from "@/components/dashboard/header"
import { authService } from "@/lib/auth-service"
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

export default function ManagementDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showTripDetails, setShowTripDetails] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  
  const [settings, setSettings] = useState({
    maxWaitTime: 30,
    minSavings: 15,
    maxDetour: 10,
    defaultVehicle: 'car-4'
  })
  
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
    const user = authService.getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    setIsAdmin(user?.role === 'admin')
    
    // Load saved settings
    const savedSettings = localStorage.getItem('management_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
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
    const pendingTrips = trips.filter(t => t.status === 'pending').length
    const optimizedTrips = trips.filter(t => t.status === 'optimized').length
    
    const totalSavings = trips.reduce((sum, t) => {
      if (t.status === 'optimized' && t.estimatedCost) {
        const actualCost = t.actualCost || (t.estimatedCost * 0.75)
        return sum + (t.estimatedCost - actualCost)
      }
      return sum
    }, 0)
    
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyTrips = trips.filter(t => {
      const date = new Date(t.departureDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length
    
    const uniqueEmployees = new Set(trips.map(t => t.userId)).size
    const averageSavings = optimizedTrips > 0 ? totalSavings / optimizedTrips : 0
    const optimizationRate = totalTrips > 0 ? (optimizedTrips / totalTrips) * 100 : 0

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
    setIsRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Dashboard data has been updated",
    })
  }

  const exportReport = () => {
    // Generate comprehensive CSV report
    const headers = ['ID', 'Employee', 'Email', 'From', 'To', 'Date', 'Time', 'Status', 'Vehicle', 'Est. Cost', 'Actual Cost', 'Savings']
    const rows = trips.map(t => [
      t.id.slice(0, 8),
      t.userName,
      t.userEmail,
      getLocationName(t.departureLocation),
      getLocationName(t.destination),
      t.departureDate,
      t.departureTime,
      t.status,
      t.vehicleType || 'N/A',
      t.estimatedCost || 0,
      t.actualCost || t.estimatedCost || 0,
      (t.estimatedCost || 0) - (t.actualCost || t.estimatedCost || 0)
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `management-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast({
      title: "Report Exported",
      description: "Management report has been downloaded",
    })
  }

  const handleViewTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowTripDetails(true)
  }

  const handleApproveTrip = async (tripId: string) => {
    try {
      await fabricService.updateTrip(tripId, { 
        status: 'confirmed',
        notified: true 
      })
      const trip = trips.find(t => t.id === tripId)
      if (trip) {
        await emailService.sendApprovalNotification(trip)
      }
      toast({
        title: "Trip Approved",
        description: "Trip has been approved and employee notified",
      })
      await loadDashboardData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve trip",
        variant: "destructive"
      })
    }
  }

  const handleSaveSettings = () => {
    setIsSavingSettings(true)
    try {
      localStorage.setItem('management_settings', JSON.stringify(settings))
      // Update config (in production, this would update backend)
      config.optimization.maxWaitTime = settings.maxWaitTime
      config.optimization.minSavingsPercentage = settings.minSavings
      config.optimization.maxDetour = settings.maxDetour
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        {isAdmin ? <AdminHeader /> : <DashboardHeader />}
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {isAdmin ? <AdminHeader /> : <DashboardHeader />}
      <div className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
            <p className="text-gray-500 mt-1">Comprehensive overview of trip management system</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportReport} className="bg-red-600 hover:bg-red-700">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-red-600 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('all')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Trips</CardTitle>
                <Car className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.monthlyTrips} this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Savings</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSavings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {formatCurrency(stats.averageSavings)}/trip
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Optimization Rate</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.optimizationRate.toFixed(1)}%</div>
              <Progress value={stats.optimizationRate} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Employees</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEmployees}</div>
              <p className="text-xs text-gray-500 mt-1">
                Using the system
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-red-50 border border-red-200">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">All Trips</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                            trip.status === 'confirmed' ? 'bg-green-400' :
                            trip.status === 'pending' ? 'bg-yellow-400' :
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
                          <p className="text-sm font-medium">{trip.departureDate}</p>
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
                        {trips.filter(t => t.status === 'confirmed' && !t.optimizedGroupId).length}
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
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Locations</SelectItem>
                        <SelectItem value="HCM Office">HCM Office</SelectItem>
                        <SelectItem value="Phan Thiet Factory">Phan Thiet Factory</SelectItem>
                        <SelectItem value="Long An Factory">Long An Factory</SelectItem>
                        <SelectItem value="Long An Factory">Tay Ninh Factory</SelectItem>
                      </SelectContent>
                    </Select>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Trip ID</th>
                        <th className="text-left p-3">Employee</th>
                        <th className="text-left p-3">Route</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Cost</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.map((trip) => (
                        <tr key={trip.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-xs">{trip.id.slice(0, 8)}</td>
                          <td className="p-3">{trip.userName}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs">
                                {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">{trip.departureDate}</td>
                          <td className="p-3">
                            <Badge 
                              variant={trip.status === 'optimized' ? 'default' : 'outline'}
                              className={
                                trip.status === 'optimized' ? 'bg-blue-100 text-blue-700' :
                                trip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                trip.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }
                            >
                              {trip.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {trip.estimatedCost && formatCurrency(trip.estimatedCost)}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleViewTrip(trip)}>
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              {trip.status === 'pending' && isAdmin && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => handleApproveTrip(trip.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trip Distribution by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(config.locations).map(location => {
                      const count = trips.filter(t => 
                        t.departureLocation === location || t.destination === location
                      ).length
                      const percentage = trips.length > 0 ? (count / trips.length) * 100 : 0
                      
                      return (
                        <div key={location}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{getLocationName(location)}</span>
                            <span className="font-medium">{count} trips</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(config.vehicles).map(vehicle => {
                      const count = trips.filter(t => t.vehicleType === vehicle).length
                      const percentage = trips.length > 0 ? (count / trips.length) * 100 : 0
                      
                      return (
                        <div key={vehicle}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{config.vehicles[vehicle as keyof typeof config.vehicles].name}</span>
                            <span className="font-medium">{count} trips</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Trip Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Employee</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Total Trips</th>
                        <th className="text-left p-3">Optimized</th>
                        <th className="text-left p-3">Savings</th>
                        <th className="text-left p-3">Last Trip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(trips.map(t => t.userId))).map(userId => {
                        const userTrips = trips.filter(t => t.userId === userId)
                        const user = userTrips[0]
                        const optimized = userTrips.filter(t => t.status === 'optimized').length
                        const savings = userTrips.reduce((sum, t) => {
                          if (t.status === 'optimized' && t.estimatedCost) {
                            const actualCost = t.actualCost || (t.estimatedCost * 0.75)
                            return sum + (t.estimatedCost - actualCost)
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
                            <td className="p-3">{userTrips[userTrips.length - 1].departureDate}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure system parameters and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxWait">Max Wait Time (minutes)</Label>
                    <Input 
                      id="maxWait"
                      type="number" 
                      value={settings.maxWaitTime}
                      onChange={(e) => setSettings({...settings, maxWaitTime: parseInt(e.target.value)})}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="minSavings">Min Savings Percentage</Label>
                    <Input 
                      id="minSavings"
                      type="number" 
                      value={settings.minSavings}
                      onChange={(e) => setSettings({...settings, minSavings: parseInt(e.target.value)})}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDetour">Max Detour Distance (km)</Label>
                    <Input 
                      id="maxDetour"
                      type="number" 
                      value={settings.maxDetour}
                      onChange={(e) => setSettings({...settings, maxDetour: parseInt(e.target.value)})}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultVehicle">Default Vehicle Type</Label>
                    <Select value={settings.defaultVehicle} onValueChange={(v) => setSettings({...settings, defaultVehicle: v})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car-4">4-Seater Car</SelectItem>
                        <SelectItem value="car-7">7-Seater Car</SelectItem>
                        <SelectItem value="van-16">16-Seater Van</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
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
                      selectedTrip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      selectedTrip.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
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
                      {selectedTrip.departureDate} at {selectedTrip.departureTime}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Return</Label>
                    <p className="font-medium">
                      {selectedTrip.returnDate} at {selectedTrip.returnTime}
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
              {selectedTrip?.status === 'pending' && isAdmin && (
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
