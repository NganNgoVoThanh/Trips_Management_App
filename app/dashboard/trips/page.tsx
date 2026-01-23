"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  Download,
  Car,
  MapPin,
  Calendar,
  Clock,
  Filter,
  Search,
  TrendingUp,
  BarChart3
} from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName } from "@/lib/config"
import { getStatusBadge, getStatusLabel, getStatusIcon, TripStatus } from "@/lib/trip-status-config"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

export default function AllTripsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departureFilter, setDepartureFilter] = useState("all")
  const [destinationFilter, setDestinationFilter] = useState("all")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    optimized: 0,
    cancelled: 0,
    mostVisited: "",
    totalDistance: 0
  })

  useEffect(() => {
    if (session?.user?.id) {
      loadTrips()
    }
  }, [session])

  useEffect(() => {
    filterTrips()
    calculateStats()
  }, [trips, searchTerm, statusFilter, departureFilter, destinationFilter])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      if (!session?.user?.id) {
        router.push('/')
        return
      }

      const allTrips = await fabricService.getTrips({ userId: session.user.id })
      setTrips(allTrips)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const pending = trips.filter(t => t.status === 'pending_approval' || t.status === 'pending_urgent').length
    const confirmed = trips.filter(t => t.status === 'approved_solo' || t.status === 'approved' || t.status === 'auto_approved').length
    const optimized = trips.filter(t => t.status === 'optimized').length
    const cancelled = trips.filter(t => t.status === 'cancelled' || t.status === 'rejected').length

    // Find most visited location
    const destinations = trips.map(t => t.destination)
    const locationCounts: Record<string, number> = {}
    destinations.forEach(dest => {
      locationCounts[dest] = (locationCounts[dest] || 0) + 1
    })
    const mostVisited = Object.keys(locationCounts).reduce((a, b) => 
      locationCounts[a] > locationCounts[b] ? a : b
    , '')

    setStats({
      total: trips.length,
      pending,
      confirmed,
      optimized,
      cancelled,
      mostVisited: mostVisited ? getLocationName(mostVisited) : 'N/A',
      totalDistance: trips.length * 120 // Estimated
    })
  }

  const filterTrips = () => {
    let filtered = [...trips]

    if (searchTerm) {
      filtered = filtered.filter(trip =>
        getLocationName(trip.departureLocation).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLocationName(trip.destination).toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.userName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter)
    }

    // Departure location filter
    if (departureFilter !== 'all') {
      filtered = filtered.filter(trip => trip.departureLocation === departureFilter)
    }

    // Destination location filter
    if (destinationFilter !== 'all') {
      filtered = filtered.filter(trip => trip.destination === destinationFilter)
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.departureDate).getTime()
      const dateB = new Date(b.departureDate).getTime()
      return dateB - dateA
    })

    setFilteredTrips(filtered)
  }

  // Removed getStatusColor - now using helper functions from trip-status-config

  const exportTrips = () => {
    const csv = [
      ['Date', 'From', 'To', 'Status', 'Vehicle', 'Cost'],
      ...filteredTrips.map(t => [
        t.departureDate,
        getLocationName(t.departureLocation),
        getLocationName(t.destination),
        t.status,
        t.vehicleType || 'N/A',
        t.estimatedCost || 0
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trips-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

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
                <Car className="h-6 w-6 text-red-600" />
                All Trips
              </h1>
              <p className="text-gray-500">Complete history of your business trips</p>
            </div>
          </div>
          <Button onClick={exportTrips} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Optimized</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.optimized}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cancelled/Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Trip Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Optimization Rate</span>
                  <span className="text-sm font-medium">
                    {stats.total > 0 ? Math.round((stats.optimized / stats.total) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats.total > 0 ? (stats.optimized / stats.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-medium">
                    {stats.total > 0 ? Math.round(((stats.confirmed + stats.optimized) / stats.total) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats.total > 0 ? ((stats.confirmed + stats.optimized) / stats.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Most Visited</span>
                <span className="text-sm font-medium">{stats.mostVisited}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Est. Total Distance</span>
                <span className="text-sm font-medium">{stats.totalDistance} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. per Month</span>
                <span className="text-sm font-medium">
                  {stats.total > 0 ? Math.round(stats.total / 12) : 0} trips
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search trips..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters Row */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="pending_urgent">Pending (Urgent)</SelectItem>
                    <SelectItem value="auto_approved">Auto-Approved</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="approved_solo">Approved (Solo)</SelectItem>
                    <SelectItem value="optimized">Optimized</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                {/* Departure Location Filter */}
                <Select value={departureFilter} onValueChange={setDepartureFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="From location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departures</SelectItem>
                    <SelectItem value="HCM Office">HCM Office</SelectItem>
                    <SelectItem value="Phan Thiet Factory">Phan Thiet Factory</SelectItem>
                    <SelectItem value="Long An Factory">Long An Factory</SelectItem>
                    <SelectItem value="Tay Ninh Factory">Tay Ninh Factory</SelectItem>
                  </SelectContent>
                </Select>

                {/* Destination Location Filter */}
                <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="To location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Destinations</SelectItem>
                    <SelectItem value="HCM Office">HCM Office</SelectItem>
                    <SelectItem value="Phan Thiet Factory">Phan Thiet Factory</SelectItem>
                    <SelectItem value="Long An Factory">Long An Factory</SelectItem>
                    <SelectItem value="Tay Ninh Factory">Tay Ninh Factory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trips List */}
        <Card>
          <CardHeader>
            <CardTitle>Trip History ({filteredTrips.length})</CardTitle>
            <CardDescription>
              {filteredTrips.length === trips.length 
                ? 'Showing all trips' 
                : `Showing ${filteredTrips.length} of ${trips.length} trips`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Loading trips...</p>
              ) : filteredTrips.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No trips found</p>
              ) : (
                filteredTrips.map(trip => (
                  <div 
                    key={trip.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                        </span>
                        <Badge className={getStatusBadge(trip.status as TripStatus)}>
                          {getStatusIcon(trip.status as TripStatus)} {getStatusLabel(trip.status as TripStatus)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 ml-7">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(trip.departureDate).toLocaleDateString('en-GB')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {trip.departureTime}
                        </span>
                        {trip.vehicleType && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {trip.vehicleType}
                          </span>
                        )}
                      </div>
                    </div>
                    {trip.estimatedCost && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(trip.actualCost || trip.estimatedCost)}
                        </p>
                        {trip.actualCost && trip.actualCost < trip.estimatedCost && (
                          <p className="text-xs text-green-600">
                            Saved {formatCurrency(trip.estimatedCost - trip.actualCost)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}