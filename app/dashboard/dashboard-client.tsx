"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TripRegistration } from "@/components/trip-registration"
import { UpcomingTrips } from "@/components/upcoming-trips"
import { AvailableTrips } from "@/components/available-trips"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { authService } from "@/lib/auth-service"
import { fabricService, Trip } from "@/lib/fabric-service"
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
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export function DashboardClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    savedAmount: 0,
    optimizationRate: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const currentUser = authService.getCurrentUser()
      
      if (!currentUser) {
        router.push('/')
        return
      }
      
      setUser(currentUser)
      
      // Load trips from database
      const trips = await fabricService.getTrips({ userId: currentUser.id })
      
      // Calculate real statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const upcoming = trips.filter(t => {
        const tripDate = new Date(t.departureDate)
        tripDate.setHours(0, 0, 0, 0)
        return tripDate >= today && t.status !== 'cancelled'
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
      
      setStats({
        totalTrips: trips.length,
        upcomingTrips: upcoming.length,
        savedAmount: savings,
        optimizationRate: trips.length > 0 ? (optimized.length / trips.length) * 100 : 0
      })
      
      // Get recent activity from real trips
      const sortedTrips = [...trips].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
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
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <DashboardHeader />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardHeader />
      
      <div className="container flex-1 space-y-6 p-8 pt-6">
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
              />
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-red-100 mt-1">
                  Manage your business trips and travel schedules
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-red-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/trips')}>
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

          <Card className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/upcoming')}>
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

          <Card className="border-l-4 border-l-green-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/savings')}>
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

          <Card className="border-l-4 border-l-purple-600 hover:shadow-md transition-shadow">
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={handleViewAllActivity}
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.status === 'optimized' ? 'bg-blue-400' :
                      activity.status === 'confirmed' ? 'bg-green-400' :
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
                      activity.status === 'confirmed' ? 'border-green-400 text-green-700' :
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
                  <Button 
                    variant="link" 
                    className="text-red-600 mt-2"
                    onClick={handleQuickRegister}
                  >
                    Register your first trip →
                  </Button>
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
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Register Trip
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  My Trips
                </TabsTrigger>
                <TabsTrigger 
                  value="available"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Available Trips
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="register" className="space-y-4">
                <TripRegistration />
              </TabsContent>
              
              <TabsContent value="upcoming" className="space-y-4">
                <UpcomingTrips />
              </TabsContent>
              
              <TabsContent value="available" className="space-y-4">
                <AvailableTrips />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}