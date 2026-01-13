"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TripRegistration } from "@/components/dashboard/trip-registration"
import { UpcomingTrips } from "@/components/dashboard/upcoming-trips"
import { AvailableTrips } from "@/components/dashboard/available-trips"
import { DashboardHeader } from "@/components/dashboard/header"
import { AdminHeader } from "@/components/admin/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { SessionMonitor } from "@/components/session-monitor"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency } from "@/lib/config"
import {
  Car,
  TrendingDown,
  Calendar,
  Users,
  MapPin,
  Clock,
  Activity,
  ChevronRight,
  PlusCircle,
  Plane,
  Target,
  Loader2,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface DashboardClientProps {
  pendingManagerConfirmation?: boolean;
  pendingManagerEmail?: string;
}

export function DashboardClient({
  pendingManagerConfirmation = false,
  pendingManagerEmail = ''
}: DashboardClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    savedAmount: 0,
    optimizationRate: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDatabaseConfigured, setIsDatabaseConfigured] = useState(true)
  const [errorCount, setErrorCount] = useState(0)
  const [pollingDelay, setPollingDelay] = useState(60000) // Start with 60s

  // Use refs to avoid stale closure issues
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true

    // ✅ Only load data when session is available
    if (status === "authenticated" && session?.user) {
      // Initial load
      loadDashboardData()

      // Visibility change handler - pause polling when tab is not visible
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Tab is hidden, clear interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          // Tab is visible again, restart polling
          if (isDatabaseConfigured && !intervalRef.current) {
            loadDashboardData(true) // Immediate refresh
            intervalRef.current = setInterval(() => {
              loadDashboardData(true)
            }, pollingDelay)
          }
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Setup refresh interval only if database is configured
      if (isDatabaseConfigured && !document.hidden) {
        intervalRef.current = setInterval(() => {
          loadDashboardData(true) // silent refresh
        }, pollingDelay)
      }

      // Cleanup
      return () => {
        isMountedRef.current = false
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [status, session, isDatabaseConfigured, pollingDelay])

  const loadDashboardData = async (silentRefresh = false) => {
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) return

      // Only show loading spinner on initial load
      if (!silentRefresh) {
        setIsLoading(true)
      }

      // ✅ Use NextAuth session instead of authService
      if (!session?.user) {
        // Session not available yet, will retry when session loads
        return
      }

      const currentUser = session.user

      if (!isMountedRef.current) return

      // Check if service is configured
      const isConfigured = fabricService.isServiceConfigured()
      if (!isMountedRef.current) return
      setIsDatabaseConfigured(isConfigured)

      if (!isConfigured) {
        // Show warning but continue with empty data
        if (!silentRefresh) {
          console.warn('Database not configured - running in limited mode')
        }
        if (!isMountedRef.current) return
        setStats({
          totalTrips: 0,
          upcomingTrips: 0,
          savedAmount: 0,
          optimizationRate: 0
        })
        setRecentActivity([])
        return
      }

      // Load trips from database with error handling and exponential backoff
      let trips: Trip[] = []
      try {
        trips = await fabricService.getTrips({ userId: currentUser.id })

        // Success - reset error count and polling delay
        if (!isMountedRef.current) return
        setErrorCount(0)
        setPollingDelay(60000) // Back to 60s
      } catch (error) {
        console.warn('Failed to load trips:', error)
        trips = []

        if (!isMountedRef.current) return

        // Increment error count and apply exponential backoff
        const newErrorCount = errorCount + 1
        setErrorCount(newErrorCount)

        // Exponential backoff: 60s -> 120s -> 240s -> max 300s (5min)
        const newDelay = Math.min(60000 * Math.pow(2, newErrorCount), 300000)
        setPollingDelay(newDelay)

        // Only show toast on repeated failures (not first error)
        if (newErrorCount > 2 && !silentRefresh) {
          toast({
            title: "Connection Issue",
            description: "Having trouble connecting to server. Will retry automatically.",
            variant: "destructive"
          })
        }

        // If too many errors, stop polling temporarily
        if (newErrorCount >= 5) {
          console.error('Too many consecutive errors, pausing polling')
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }
      }
      
      // Calculate real statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const upcoming = trips.filter(t => {
        try {
          const tripDate = new Date(t.departureDate)
          tripDate.setHours(0, 0, 0, 0)
          return tripDate >= today && t.status !== 'cancelled'
        } catch {
          return false
        }
      })
      
      const optimized = trips.filter(t => t.status === 'optimized')
      
      // Calculate actual savings
      const savings = trips.reduce((sum, trip) => {
        if (trip.status === 'optimized' && trip.estimatedCost && trip.actualCost) {
          return sum + (trip.estimatedCost - trip.actualCost)
        } else if (trip.status === 'optimized' && trip.estimatedCost) {
          // Estimate 25% savings for optimized trips without actual cost
          return sum + (trip.estimatedCost * 0.25)
        }
        return sum
      }, 0)

      if (!isMountedRef.current) return
      setStats({
        totalTrips: trips.length,
        upcomingTrips: upcoming.length,
        savedAmount: savings,
        optimizationRate: trips.length > 0 ? (optimized.length / trips.length) * 100 : 0
      })

      // Get recent activity from real trips
      const sortedTrips = [...trips].sort((a, b) => {
        try {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } catch {
          return 0
        }
      })

      if (!isMountedRef.current) return
      setRecentActivity(sortedTrips.slice(0, 5).map(t => ({
        id: t.id,
        type: t.status === 'optimized' ? 'optimized' : 'registered',
        description: `${t.departureLocation} → ${t.destination}`,
        date: t.departureDate,
        time: t.departureTime,
        status: t.status,
        createdAt: t.createdAt
      })))
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
      
      // Only show toast for initial load errors
      if (!silentRefresh) {
        toast({
          title: "Notice",
          description: "Running in limited mode. Some features may be unavailable.",
          variant: "default"
        })
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleViewAllActivity = () => {
    router.push('/dashboard/activity')
  }

  const handleQuickRegister = () => {
    // Switch to register tab
    const registerTab = document.querySelector('[value="register"]') as HTMLButtonElement
    if (registerTab) {
      registerTab.click()
    }
  }

  const formatActivityDate = (date: string, time?: string) => {
    try {
      const d = new Date(date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const isToday = d.toDateString() === today.toDateString()
      const isYesterday = d.toDateString() === yesterday.toDateString()
      
      if (isToday) {
        return `Today${time ? ` at ${time}` : ''}`
      } else if (isYesterday) {
        return `Yesterday${time ? ` at ${time}` : ''}`
      } else {
        return `${d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}${time ? ` at ${time}` : ''}`
      }
    } catch {
      return date
    }
  }

  // ✅ Show loading while checking authentication or loading initial data
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    const isAdmin = session?.user?.role === 'admin';
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        {isAdmin ? <AdminHeader /> : <DashboardHeader />}
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {status === "loading" ? "Checking authentication..." : "Loading dashboard..."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push('/')
    return null
  }

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  return (
    <>
      <SessionMonitor />
      <div className="flex min-h-dvh flex-col bg-gray-50">
        {isAdmin ? <AdminHeader /> : <DashboardHeader />}

        <div className="container flex-1 space-y-4 p-8 pt-6">
        {/* Database Warning Alert */}
        {!isDatabaseConfigured && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Limited Mode:</strong> Database is not configured. 
              Add Supabase credentials to enable full functionality.
              <a 
                href="https://supabase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-yellow-700 underline hover:text-yellow-900"
              >
                Setup Guide →
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Manager Confirmation Pending Warning */}
        {pendingManagerConfirmation && (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Manager Confirmation Pending</strong>
              <p className="mt-1">
                A confirmation email has been sent to <strong>{pendingManagerEmail}</strong>.
                You can browse the system, but trip submission will be enabled after your manager confirms.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Section with Logo */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Image
                src="/intersnack-logo.png"
                alt="Intersnack"
                width={100}
                height={50}
                className="object-contain bg-white p-2 rounded"
                priority
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0]}!</h1>
                <p className="text-red-100 mt-1">
                  Manage your business trips and travel schedules
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="border-l-4 border-l-red-600 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/trips')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Car className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                All time travel history
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/upcoming')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Trips</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingTrips}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled for this month
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-l-green-600 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/savings')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money Saved</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.savedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Through trip optimization
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-l-purple-600 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/activity')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.optimizationRate.toFixed(0)}%</div>
              <Progress value={stats.optimizationRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="h-full">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-600" />
                Recent Activity
              </CardTitle>
              {isDatabaseConfigured && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={handleViewAllActivity}
                >
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'optimized' ? 'bg-blue-400' :
                      activity.status === 'approved' || activity.status === 'approved_solo' || activity.status === 'auto_approved' ? 'bg-green-400' :
                      activity.status === 'cancelled' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatActivityDate(activity.date, activity.time)}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      activity.status === 'optimized' ? 'border-blue-400 text-blue-700' :
                      activity.status === 'approved' || activity.status === 'approved_solo' || activity.status === 'auto_approved' ? 'border-green-400 text-green-700' :
                      activity.status === 'cancelled' ? 'border-red-400 text-red-700' :
                      'border-yellow-400 text-yellow-700'
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Plane className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent trips</p>
                  {isDatabaseConfigured && (
                    <Button 
                      variant="link" 
                      className="text-red-600 mt-2"
                      onClick={handleQuickRegister}
                    >
                      Register your first trip →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs Section */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <CardTitle className="text-xl">Trip Management</CardTitle>
            <CardDescription className="text-red-100">
              Register new trips, view upcoming schedules, and find available trips to join
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="register" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-red-50">
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                  disabled={!isDatabaseConfigured}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Register Trip
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                  disabled={!isDatabaseConfigured}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  My Trips
                </TabsTrigger>
                <TabsTrigger 
                  value="available"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                  disabled={!isDatabaseConfigured}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Available Trips
                </TabsTrigger>
              </TabsList>
              
              {isDatabaseConfigured ? (
                <>
                  <TabsContent value="register" className="space-y-4">
                    <TripRegistration />
                  </TabsContent>
                  
                  <TabsContent value="upcoming" className="space-y-4">
                    <UpcomingTrips />
                  </TabsContent>
                  
                  <TabsContent value="available" className="space-y-4">
                    <AvailableTrips />
                  </TabsContent>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p className="text-lg font-medium mb-2">Database Not Configured</p>
                  <p className="text-sm">Please configure Supabase to enable trip management features.</p>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}