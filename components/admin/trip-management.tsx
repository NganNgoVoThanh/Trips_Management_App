"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Clock, MapPin, Mail, Search, Loader2, Car, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fabricService, Trip } from "@/lib/fabric-service"
import { emailService } from "@/lib/email-service"
import { config, getLocationName, formatCurrency } from "@/lib/config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function TripManagement() {
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [sendingNotification, setSendingNotification] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    loadTrips()
  }, [])

  useEffect(() => {
    filterTrips()
  }, [trips, searchTerm, statusFilter])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      
      // Load all trips from Fabric/localStorage
      const allTrips = await fabricService.getTrips()
      
      // Sort by creation date (newest first)
      allTrips.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((trip) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          trip.userName.toLowerCase().includes(searchLower) ||
          trip.userEmail.toLowerCase().includes(searchLower) ||
          getLocationName(trip.departureLocation).toLowerCase().includes(searchLower) ||
          getLocationName(trip.destination).toLowerCase().includes(searchLower)
        )
      })
    }

    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "confirmed":
          filtered = filtered.filter(t => t.status === "confirmed")
          break
        case "pending":
          filtered = filtered.filter(t => t.status === "pending")
          break
        case "optimized":
          filtered = filtered.filter(t => t.status === "optimized")
          break
        case "cancelled":
          filtered = filtered.filter(t => t.status === "cancelled")
          break
        case "not-notified":
          filtered = filtered.filter(t => !t.notified && t.status !== "cancelled")
          break
      }
    }

    setFilteredTrips(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleSendNotification = async (tripId: string) => {
    setSendingNotification(tripId)
    
    try {
      const trip = trips.find(t => t.id === tripId)
      if (!trip) return

      // Send appropriate notification based on status
      if (trip.status === 'confirmed') {
        await emailService.sendApprovalNotification(trip)
      } else if (trip.status === 'optimized') {
        // For optimized trips, need to get the group info
        const groups = await fabricService.getOptimizationGroups()
        const group = groups.find(g => g.trips.includes(tripId))
        
        if (group) {
          const groupTrips = trips.filter(t => group.trips.includes(t.id))
          await emailService.sendOptimizationNotification(
            groupTrips,
            trip.departureTime,
            trip.vehicleType || 'car-4',
            group.estimatedSavings
          )
        }
      } else {
        await emailService.sendTripConfirmation(trip)
      }

      // Update trip as notified
      await fabricService.updateTrip(tripId, { notified: true })
      
      toast({
        title: "Notification Sent",
        description: "Email has been sent to the employee",
      })
      
      // Reload trips
      await loadTrips()
    } catch (error: any) {
      toast({
        title: "Notification Failed",
        description: error.message || "Failed to send notification",
        variant: "destructive"
      })
    } finally {
      setSendingNotification(null)
    }
  }

  const handleUpdateStatus = async (tripId: string, newStatus: string) => {
    setUpdatingStatus(tripId)
    
    try {
      await fabricService.updateTrip(tripId, { 
        status: newStatus as Trip['status'],
        notified: false // Reset notification status when status changes
      })
      
      toast({
        title: "Status Updated",
        description: `Trip status has been updated to ${newStatus}`,
      })
      
      // Reload trips
      await loadTrips()
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update trip status",
        variant: "destructive"
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'optimized':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Management</CardTitle>
        <CardDescription>
          View and manage all registered trips ({trips.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, email, or location..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips ({trips.length})</SelectItem>
              <SelectItem value="confirmed">
                Confirmed ({trips.filter(t => t.status === 'confirmed').length})
              </SelectItem>
              <SelectItem value="pending">
                Pending ({trips.filter(t => t.status === 'pending').length})
              </SelectItem>
              <SelectItem value="optimized">
                Optimized ({trips.filter(t => t.status === 'optimized').length})
              </SelectItem>
              <SelectItem value="cancelled">
                Cancelled ({trips.filter(t => t.status === 'cancelled').length})
              </SelectItem>
              <SelectItem value="not-notified">
                Not Notified ({trips.filter(t => !t.notified && t.status !== 'cancelled').length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="mb-2 h-10 w-10 text-gray-400" />
            <h3 className="mb-1 text-lg font-medium">No Trips Found</h3>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter !== "all" 
                ? "Try changing your filters or search term"
                : "No trips have been registered yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="rounded-lg border p-4 shadow-sm transition-all hover:shadow">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {trip.userName}
                      </h3>
                      <Badge variant="outline" className={getStatusColor(trip.status)}>
                        {trip.status}
                      </Badge>
                      {trip.optimizedGroupId && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Grouped
                        </Badge>
                      )}
                      {!trip.notified && trip.status !== 'pending' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          Not Notified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {trip.userEmail}
                    </div>
                    
                    <div className="flex flex-col gap-1 text-sm text-gray-500 md:flex-row md:gap-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-sm text-gray-500 md:flex-row md:gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Departure: {formatDate(trip.departureDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{trip.departureTime}</span>
                        {trip.originalDepartureTime && trip.originalDepartureTime !== trip.departureTime && (
                          <span className="text-amber-600">(was {trip.originalDepartureTime})</span>
                        )}
                      </div>
                    </div>
                    
                    {trip.vehicleType && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Car className="h-4 w-4" />
                        <span>{config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</span>
                      </div>
                    )}
                    
                    {trip.estimatedCost && (
                      <div className="text-sm font-medium">
                        Cost: {formatCurrency(trip.estimatedCost)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Trip Details</DialogTitle>
                          <DialogDescription>
                            Complete information for trip {trip.id}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="mb-2 font-medium">Employee Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Name:</span>
                                  <span>{trip.userName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Email:</span>
                                  <span>{trip.userEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">User ID:</span>
                                  <span className="font-mono text-xs">{trip.userId}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="mb-2 font-medium">Status Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Status:</span>
                                  <Badge variant="outline" className={getStatusColor(trip.status)}>
                                    {trip.status}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Notified:</span>
                                  <span>{trip.notified ? 'Yes' : 'No'}</span>
                                </div>
                                {trip.optimizedGroupId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Group ID:</span>
                                    <span className="font-mono text-xs">{trip.optimizedGroupId}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="mb-2 font-medium">Trip Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">From:</span>
                                <span>{getLocationName(trip.departureLocation)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">To:</span>
                                <span>{getLocationName(trip.destination)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Departure:</span>
                                <span>{formatDate(trip.departureDate)} at {trip.departureTime}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Return:</span>
                                <span>{formatDate(trip.returnDate)} at {trip.returnTime}</span>
                              </div>
                              {trip.vehicleType && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Vehicle:</span>
                                  <span>{config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name}</span>
                                </div>
                              )}
                              {trip.estimatedCost && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Estimated Cost:</span>
                                  <span className="font-medium">{formatCurrency(trip.estimatedCost)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="mb-2 font-medium">Timestamps</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Created:</span>
                                <span>{new Date(trip.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Updated:</span>
                                <span>{new Date(trip.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {trip.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(trip.id, 'confirmed')}
                          disabled={updatingStatus === trip.id}
                        >
                          {updatingStatus === trip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(trip.id, 'cancelled')}
                          disabled={updatingStatus === trip.id}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    
                    {!trip.notified && trip.status !== 'pending' && trip.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNotification(trip.id)}
                        disabled={sendingNotification === trip.id}
                      >
                        {sendingNotification === trip.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-1 h-4 w-4" />
                        )}
                        Notify
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}