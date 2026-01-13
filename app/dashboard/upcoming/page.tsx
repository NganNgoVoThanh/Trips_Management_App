"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  Calendar, 
  Clock,
  MapPin,
  Car,
  Users,
  AlertCircle,
  CheckCircle,
  Download
} from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStatusBadge, getStatusLabel, getStatusIcon, TripStatus } from "@/lib/trip-status-config"

export default function UpcomingTripsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("this-week")

  useEffect(() => {
    if (session?.user?.id) {
      loadUpcomingTrips()
    }
  }, [session])

  const loadUpcomingTrips = async () => {
    try {
      setIsLoading(true)
      if (!session?.user?.id) {
        router.push('/')
        return
      }

      const allTrips = await fabricService.getTrips({ userId: session.user.id })
      
      // Filter upcoming trips
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const upcoming = allTrips.filter(t => {
        try {
          const tripDate = new Date(t.departureDate)
          tripDate.setHours(0, 0, 0, 0)
          return tripDate >= today && t.status !== 'cancelled'
        } catch {
          return false
        }
      }).sort((a, b) => {
        return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
      })

      setTrips(upcoming)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast({
        title: "Error",
        description: "Failed to load upcoming trips",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTripsForPeriod = (period: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (period) {
      case 'this-week':
        const endOfWeek = new Date(today)
        endOfWeek.setDate(today.getDate() + 7)
        return trips.filter(t => {
          const tripDate = new Date(t.departureDate)
          return tripDate >= today && tripDate <= endOfWeek
        })
      
      case 'next-week':
        const startNextWeek = new Date(today)
        startNextWeek.setDate(today.getDate() + 7)
        const endNextWeek = new Date(startNextWeek)
        endNextWeek.setDate(startNextWeek.getDate() + 7)
        return trips.filter(t => {
          const tripDate = new Date(t.departureDate)
          return tripDate >= startNextWeek && tripDate <= endNextWeek
        })
      
      case 'this-month':
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return trips.filter(t => {
          const tripDate = new Date(t.departureDate)
          return tripDate >= today && tripDate <= endOfMonth
        })
      
      case 'all':
      default:
        return trips
    }
  }


  const getDaysUntil = (date: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tripDate = new Date(date)
    tripDate.setHours(0, 0, 0, 0)
    const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff < 7) return `In ${diff} days`
    return `In ${Math.ceil(diff / 7)} weeks`
  }

  const exportUpcoming = () => {
    const csv = [
      ['Date', 'Days Until', 'From', 'To', 'Time', 'Status'],
      ...trips.map(t => [
        new Date(t.departureDate).toLocaleDateString('en-GB'),
        getDaysUntil(t.departureDate),
        getLocationName(t.departureLocation),
        getLocationName(t.destination),
        t.departureTime,
        t.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upcoming-trips-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const renderTripCard = (trip: Trip) => (
    <Card key={trip.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Route */}
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-lg">
                  {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(trip.departureDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {trip.departureTime}
              </span>
            </div>

            {/* Additional Info */}
            <div className="flex items-center gap-3 text-sm">
              <Badge className={getStatusBadge(trip.status as TripStatus)}>
                {getStatusIcon(trip.status as TripStatus)} {getStatusLabel(trip.status as TripStatus)}
              </Badge>
              {trip.vehicleType && (
                <span className="flex items-center gap-1 text-gray-600">
                  <Car className="h-3 w-3" />
                  {trip.vehicleType}
                </span>
              )}
              {trip.optimizedGroupId && (
                <span className="flex items-center gap-1 text-green-600">
                  <Users className="h-3 w-3" />
                  Shared ride
                </span>
              )}
            </div>

            {/* Return Trip Info */}
            {trip.returnDate && (
              <div className="pt-2 border-t text-sm text-gray-500">
                Return: {new Date(trip.returnDate).toLocaleDateString('en-GB')} at {trip.returnTime}
              </div>
            )}
          </div>

          {/* Right Side: Days Until & Cost */}
          <div className="text-right space-y-2">
            <Badge variant="outline" className="text-lg font-semibold">
              {getDaysUntil(trip.departureDate)}
            </Badge>
            {trip.estimatedCost && (
              <p className="text-sm text-gray-600">
                {formatCurrency(trip.actualCost || trip.estimatedCost)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
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
                <Calendar className="h-6 w-6 text-blue-600" />
                Upcoming Trips
              </h1>
              <p className="text-gray-500">Your scheduled business trips</p>
            </div>
          </div>
          <Button onClick={exportUpcoming} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {getTripsForPeriod('this-week').length}
              </p>
              <p className="text-xs text-gray-500">trips scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Next Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {getTripsForPeriod('next-week').length}
              </p>
              <p className="text-xs text-gray-500">trips scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {getTripsForPeriod('this-month').length}
              </p>
              <p className="text-xs text-gray-500">trips scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Trips by Period */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="this-week">This Week</TabsTrigger>
            <TabsTrigger value="next-week">Next Week</TabsTrigger>
            <TabsTrigger value="this-month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value="this-week" className="space-y-4 mt-6">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading trips...</p>
            ) : getTripsForPeriod('this-week').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trips scheduled for this week</p>
                </CardContent>
              </Card>
            ) : (
              getTripsForPeriod('this-week').map(renderTripCard)
            )}
          </TabsContent>

          <TabsContent value="next-week" className="space-y-4 mt-6">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading trips...</p>
            ) : getTripsForPeriod('next-week').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trips scheduled for next week</p>
                </CardContent>
              </Card>
            ) : (
              getTripsForPeriod('next-week').map(renderTripCard)
            )}
          </TabsContent>

          <TabsContent value="this-month" className="space-y-4 mt-6">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading trips...</p>
            ) : getTripsForPeriod('this-month').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trips scheduled this month</p>
                </CardContent>
              </Card>
            ) : (
              getTripsForPeriod('this-month').map(renderTripCard)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-6">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Loading trips...</p>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500">You have no upcoming trips</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/dashboard?tab=register')}
                  >
                    Register New Trip
                  </Button>
                </CardContent>
              </Card>
            ) : (
              trips.map(renderTripCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}