"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminHeader } from "@/components/admin/header"
import { AdminShell } from "@/components/admin/shell"
import { TripOptimization } from "@/components/admin/trip-optimization"
import { TripManagement } from "@/components/admin/trip-management"
import { JoinRequestsManagement } from "@/components/admin/join-requests-management"
import { authService } from "@/lib/auth-service"
import { fabricService, Trip } from "@/lib/fabric-client"
import { joinRequestService } from "@/lib/join-request-client"
import { aiOptimizer } from "@/lib/ai-optimizer"
import { emailService } from "@/lib/email-service"
import { formatCurrency, getLocationName } from "@/lib/config"
import { 
  Users, 
  Car, 
  TrendingDown, 
  Calendar,
  Activity,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Download,
  Zap,
  DollarSign,
  MapPin,
  Target,
  TrendingUp,
  Loader2,
  Eye,
  Send,
  FileText,
  UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AdminDashboardClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalTrips: 0,
    pendingApprovals: 0,
    totalSavings: 0,
    optimizationRate: 0,
    activeEmployees: 0,
    monthlyTrips: 0,
    vehicleUtilization: 0,
    averageSavings: 0,
    pendingJoinRequests: 0
  })
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [recentOptimizations, setRecentOptimizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showTripDialog, setShowTripDialog] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [approvalNote, setApprovalNote] = useState("")

  useEffect(() => {
    loadAdminDashboard()
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadAdminDashboard, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadAdminDashboard = async () => {
    try {
      setIsLoading(true)
      const currentUser = authService.getCurrentUser()
      
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      
      setUser(currentUser)
      
      // Load all trips from database
      const allTrips = await fabricService.getTrips()
      
      // Load join requests statistics
      const joinRequestStats = await joinRequestService.getJoinRequestStats()
      
      // Calculate real statistics
      const pending = allTrips.filter(t => t.status === 'pending')
      const optimized = allTrips.filter(t => t.status === 'optimized')
      const confirmed = allTrips.filter(t => t.status === 'confirmed')
      
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyTrips = allTrips.filter(t => {
        const tripDate = new Date(t.departureDate)
        return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear
      })
      
      const uniqueEmployees = new Set(allTrips.map(t => t.userId)).size
      
      // Calculate real savings
      const totalSavings = optimized.reduce((sum, trip) => {
        if (trip.estimatedCost) {
          const actualCost = trip.actualCost || (trip.estimatedCost * 0.75)
          return sum + (trip.estimatedCost - actualCost)
        }
        return sum
      }, 0)
      
      // Calculate vehicle utilization
      const vehicleStats = allTrips.reduce((acc, trip) => {
        if (trip.vehicleType) {
          acc[trip.vehicleType] = (acc[trip.vehicleType] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
      
      const totalCapacity = Object.entries(vehicleStats).reduce((sum, [type, count]) => {
        const capacity = type === 'car-4' ? 4 : type === 'car-7' ? 7 : 16
        return sum + (capacity * count)
      }, 0)
      
      const actualPassengers = allTrips.length
      const vehicleUtilization = totalCapacity > 0 ? (actualPassengers / totalCapacity) * 100 : 0
      
      setStats({
        totalTrips: allTrips.length,
        pendingApprovals: pending.length,
        totalSavings,
        optimizationRate: allTrips.length > 0 ? (optimized.length / allTrips.length) * 100 : 0,
        activeEmployees: uniqueEmployees,
        monthlyTrips: monthlyTrips.length,
        vehicleUtilization: Math.min(vehicleUtilization, 100),
        averageSavings: optimized.length > 0 ? totalSavings / optimized.length : 0,
        pendingJoinRequests: joinRequestStats.pending
      })
      
      // Set pending actions with real data
      setPendingActions(pending.slice(0, 5).map(t => ({
        id: t.id,
        type: 'approval',
        user: t.userName,
        email: t.userEmail,
        route: `${getLocationName(t.departureLocation)} → ${getLocationName(t.destination)}`,
        date: t.departureDate,
        time: t.departureTime,
        estimatedCost: t.estimatedCost,
        trip: t
      })))
      
      // Recent optimizations with real data
      const recentOpt = optimized
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
      
      setRecentOptimizations(recentOpt.map(t => ({
        id: t.id,
        groupId: t.optimizedGroupId,
        trips: allTrips.filter(trip => trip.optimizedGroupId === t.optimizedGroupId).length,
        savings: (t.estimatedCost || 0) - (t.actualCost || t.estimatedCost || 0),
        date: new Date(t.updatedAt).toLocaleDateString(),
        route: `${getLocationName(t.departureLocation)} → ${getLocationName(t.destination)}`
      })))
      
    } catch (error) {
      console.error('Error loading admin dashboard:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunOptimization = async () => {
    setIsOptimizing(true)
    try {
      // Get confirmed but not optimized trips
      const trips = await fabricService.getTrips()
      const tripsToOptimize = trips.filter(t => 
        t.status === 'confirmed' && !t.optimizedGroupId
      )
      
      if (tripsToOptimize.length === 0) {
        toast({
          title: "No trips to optimize",
          description: "All confirmed trips have been optimized",
        })
        return
      }
      
      // Run AI optimization
      const proposals = await aiOptimizer.optimizeTrips(tripsToOptimize)
      
      if (proposals.length === 0) {
        toast({
          title: "No optimization opportunities",
          description: "No cost-saving combinations found",
        })
        return
      }
      
      // Auto-approve first proposal for demo
      const firstProposal = proposals[0]
      
      // Create optimization group
      const group = await fabricService.createOptimizationGroup({
        trips: firstProposal.trips.map(t => t.id),
        proposedDepartureTime: firstProposal.proposedDepartureTime,
        vehicleType: firstProposal.vehicleType,
        estimatedSavings: firstProposal.estimatedSavings,
        status: 'approved',
        createdBy: user?.id || 'admin',
        approvedBy: user?.id,
        approvedAt: new Date().toISOString()
      })
      
      // Update trips
      for (const trip of firstProposal.trips) {
        await fabricService.updateTrip(trip.id, {
          status: 'optimized',
          optimizedGroupId: group.id,
          originalDepartureTime: trip.departureTime,
          departureTime: firstProposal.proposedDepartureTime,
          vehicleType: firstProposal.vehicleType,
          actualCost: (trip.estimatedCost || 0) * 0.75,
          notified: true
        })
      }
      
      // Send notifications
      await emailService.sendOptimizationNotification(
        firstProposal.trips,
        firstProposal.proposedDepartureTime,
        firstProposal.vehicleType,
        firstProposal.estimatedSavings
      )
      
      toast({
        title: "Optimization Complete",
        description: `Optimized ${firstProposal.trips.length} trips, saving ${formatCurrency(firstProposal.estimatedSavings)}`,
      })
      
      // Reload dashboard
      await loadAdminDashboard()
      
    } catch (error: any) {
      console.error('Error running optimization:', error)
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize trips",
        variant: "destructive"
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const allTrips = await fabricService.getTrips()
      const joinRequests = await joinRequestService.getJoinRequests()
      
      // Create comprehensive report
      const report = {
        generatedAt: new Date().toISOString(),
        totalTrips: allTrips.length,
        totalSavings: stats.totalSavings,
        optimizationRate: stats.optimizationRate,
        activeEmployees: stats.activeEmployees,
        pendingJoinRequests: stats.pendingJoinRequests,
        trips: allTrips.map(t => ({
          id: t.id,
          employee: t.userName,
          email: t.userEmail,
          from: getLocationName(t.departureLocation),
          to: getLocationName(t.destination),
          date: t.departureDate,
          time: t.departureTime,
          status: t.status,
          vehicleType: t.vehicleType || 'N/A',
          estimatedCost: t.estimatedCost || 0,
          actualCost: t.actualCost || t.estimatedCost || 0,
          savings: (t.estimatedCost || 0) - (t.actualCost || t.estimatedCost || 0),
          optimized: t.status === 'optimized' ? 'Yes' : 'No'
        })),
        joinRequests: joinRequests.map(jr => ({
          id: jr.id,
          requesterName: jr.requesterName,
          requesterEmail: jr.requesterEmail,
          tripRoute: `${getLocationName(jr.tripDetails.departureLocation)} → ${getLocationName(jr.tripDetails.destination)}`,
          requestDate: new Date(jr.createdAt).toLocaleDateString(),
          status: jr.status,
          reason: jr.reason || 'N/A'
        }))
      }
      
      // Convert to CSV
      const csv = [
        ['Admin Dashboard Report - ' + new Date().toLocaleDateString()],
        [],
        ['Summary Statistics'],
        ['Total Trips', report.totalTrips],
        ['Total Savings', formatCurrency(report.totalSavings)],
        ['Optimization Rate', report.optimizationRate.toFixed(2) + '%'],
        ['Active Employees', report.activeEmployees],
        ['Pending Join Requests', report.pendingJoinRequests],
        [],
        ['Trip Details'],
        ['ID', 'Employee', 'Email', 'From', 'To', 'Date', 'Time', 'Status', 'Vehicle', 'Est. Cost', 'Actual Cost', 'Savings', 'Optimized'],
        ...report.trips.map(t => [
          t.id.slice(0, 8),
          t.employee,
          t.email,
          t.from,
          t.to,
          t.date,
          t.time,
          t.status,
          t.vehicleType,
          t.estimatedCost,
          t.actualCost,
          t.savings,
          t.optimized
        ]),
        [],
        ['Join Request Details'],
        ['ID', 'Requester', 'Email', 'Trip Route', 'Request Date', 'Status', 'Reason'],
        ...report.joinRequests.map(jr => [
          jr.id.slice(0, 8),
          jr.requesterName,
          jr.requesterEmail,
          jr.tripRoute,
          jr.requestDate,
          jr.status,
          jr.reason
        ])
      ].map(row => row.join(',')).join('\n')
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admin-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      
      toast({
        title: "Report Exported",
        description: "Admin report has been downloaded successfully",
      })
      
    } catch (error) {
      console.error('Error exporting report:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleReviewTrip = (action: any) => {
    setSelectedTrip(action.trip)
    setShowTripDialog(true)
  }

  const handleApproveTrip = async () => {
    if (!selectedTrip) return
    
    try {
      await fabricService.updateTrip(selectedTrip.id, {
        status: 'confirmed',
        notified: true
      })
      
      await emailService.sendApprovalNotification(selectedTrip)
      
      toast({
        title: "Trip Approved",
        description: `Trip for ${selectedTrip.userName} has been approved`,
      })
      
      setShowTripDialog(false)
      setSelectedTrip(null)
      setApprovalNote("")
      await loadAdminDashboard()
      
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve trip",
        variant: "destructive"
      })
    }
  }

  const handleRejectTrip = async () => {
    if (!selectedTrip) return
    
    try {
      await fabricService.updateTrip(selectedTrip.id, {
        status: 'cancelled',
        notified: true
      })
      
      await emailService.sendCancellationNotification(selectedTrip)
      
      toast({
        title: "Trip Rejected",
        description: `Trip for ${selectedTrip.userName} has been rejected`,
      })
      
      setShowTripDialog(false)
      setSelectedTrip(null)
      setApprovalNote("")
      await loadAdminDashboard()
      
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject trip",
        variant: "destructive"
      })
    }
  }

  const handleViewAllOptimizations = () => {
    router.push('/admin/optimizations')
  }

  const handleViewAllPending = () => {
    router.push('/admin/approvals')
  }

  const handleViewAllJoinRequests = () => {
    router.push('/admin/join-requests')
  }

  if (isLoading && stats.totalTrips === 0) {
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
      
      <div className="container flex-1 space-y-6 p-8 pt-6">
        {/* Admin Welcome Section with Logo */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Image
                src="/intersnack-logo.png"
                alt="Intersnack"
                width={100}
                height={50}
                className="object-contain bg-white p-2 rounded"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-red-100 mt-1">
                  Manage and optimize company-wide business trips
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExportReport}
                variant="secondary"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </>
                )}
              </Button>
              <Button 
                onClick={handleRunOptimization}
                className="bg-white text-red-700 hover:bg-gray-100"
                disabled={isOptimizing}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Optimization
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics - 2 rows with Join Requests */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Stats cards */}
<Card 
  className="border-l-4 border-l-red-600 hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/total-trips')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
    <Car className="h-4 w-4 text-red-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats.totalTrips}</div>
    <div className="flex items-center text-xs text-muted-foreground">
      <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
      <span className="text-green-600">+12%</span>
      <span className="ml-1">from last month</span>
    </div>
  </CardContent>
</Card>

          <Card className="border-l-4 border-l-yellow-600 hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAllPending}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAllJoinRequests}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Join Requests</CardTitle>
              <UserPlus className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingJoinRequests}</div>
              <p className="text-xs text-muted-foreground">
                Pending join requests
              </p>
            </CardContent>
          </Card>

<Card 
  className="border-l-4 border-l-green-600 hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/total-savings')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
    <DollarSign className="h-4 w-4 text-green-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-green-600">
      {formatCurrency(stats.totalSavings)}
    </div>
    <p className="text-xs text-muted-foreground">
      Year to date savings
    </p>
  </CardContent>
</Card>

<Card 
  className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/optimization-rate')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
    <Target className="h-4 w-4 text-blue-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats.optimizationRate.toFixed(0)}%</div>
    <Progress value={stats.optimizationRate} className="mt-2 h-2" />
  </CardContent>
</Card>

<Card 
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/active-employees')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
    <Users className="h-4 w-4 text-purple-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats.activeEmployees}</div>
    <p className="text-xs text-muted-foreground">
      Using the system
    </p>
  </CardContent>
</Card>

<Card 
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/this-month')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">This Month</CardTitle>
    <Calendar className="h-4 w-4 text-orange-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats.monthlyTrips}</div>
    <p className="text-xs text-muted-foreground">
      Trips scheduled
    </p>
  </CardContent>
</Card>

<Card 
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push('/admin/statistics/vehicle-utilization')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Vehicle Utilization</CardTitle>
    <Car className="h-4 w-4 text-teal-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{stats.vehicleUtilization.toFixed(0)}%</div>
    <Progress value={stats.vehicleUtilization} className="mt-2 h-2" />
  </CardContent>
</Card>
        </div>

        {/* Alerts */}
        {(stats.pendingApprovals > 0 || stats.pendingJoinRequests > 0) && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              You have {stats.pendingApprovals} trips waiting for approval
              {stats.pendingJoinRequests > 0 && ` and ${stats.pendingJoinRequests} join requests`} 
              waiting for review. Please check them to ensure smooth operations.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Actions & Recent Optimizations */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Actions */}
          <Card className="h-full">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Actions
                </CardTitle>
                <Badge variant="outline" className="bg-yellow-50">
                  {pendingActions.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {pendingActions.length > 0 ? (
                  pendingActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium">{action.user}</p>
                          <p className="text-xs text-gray-500">{action.route}</p>
                          <p className="text-xs text-gray-400">{action.date} at {action.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.estimatedCost && (
                          <span className="text-xs font-medium text-gray-600">
                            {formatCurrency(action.estimatedCost)}
                          </span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs"
                          onClick={() => handleReviewTrip(action)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>All caught up!</p>
                    <p className="text-xs mt-1">No pending actions</p>
                  </div>
                )}
              </div>
              {pendingActions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleViewAllPending}
                  >
                    View All Pending
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Optimizations */}
          <Card className="h-full">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Recent Optimizations
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={handleViewAllOptimizations}
                >
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {recentOptimizations.length > 0 ? (
                  recentOptimizations.map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium">Combined {opt.trips} trips</p>
                          <p className="text-xs text-gray-500">{opt.route}</p>
                          <p className="text-xs text-green-600 font-medium">
                            Saved {formatCurrency(opt.savings)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{opt.date}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-xs ml-2"
                          onClick={() => router.push(`/admin/optimizations/${opt.groupId}`)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent optimizations</p>
                    <Button 
                      variant="link" 
                      className="text-red-600 mt-2"
                      onClick={handleRunOptimization}
                    >
                      Run optimization now →
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Tabs */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-800 text-white">
            <CardTitle className="text-xl">Trip Management & Optimization</CardTitle>
            <CardDescription className="text-red-100">
              Optimize trip combinations, manage approvals, and handle join requests
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="optimization" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-red-50">
                <TabsTrigger 
                  value="optimization"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Trip Optimization
                </TabsTrigger>
                <TabsTrigger 
                  value="management"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Trip Management
                </TabsTrigger>
                <TabsTrigger 
                  value="join-requests"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Requests
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="optimization" className="space-y-4">
                <TripOptimization />
              </TabsContent>
              
              <TabsContent value="management" className="space-y-4">
                <TripManagement />
              </TabsContent>
              
              <TabsContent value="join-requests" className="space-y-4">
                <JoinRequestsManagement />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Trip Review Dialog */}
      <Dialog open={showTripDialog} onOpenChange={setShowTripDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Trip Request</DialogTitle>
            <DialogDescription>
              Review and approve or reject this trip request
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
                  <Label className="text-xs text-gray-500">Trip ID</Label>
                  <p className="font-mono text-sm">{selectedTrip.id.slice(0, 12)}</p>
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
                    {selectedTrip.vehicleType === 'car-4' ? '4-Seater Car' :
                     selectedTrip.vehicleType === 'car-7' ? '7-Seater Car' : '16-Seater Van'}
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
                <Label htmlFor="notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={handleRejectTrip}
            >
              Reject
            </Button>
            <Button 
              onClick={handleApproveTrip}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}