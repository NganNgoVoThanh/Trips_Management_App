"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fabricService, Trip } from "@/lib/fabric-client"
import { joinRequestService } from "@/lib/join-request-client"
import { authService } from "@/lib/auth-service"
import { config, getLocationName, formatCurrency, calculateDistance } from "@/lib/config"
import { Calendar, Clock, MapPin, Users, Search, Filter, Loader2, Send, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AvailableTrips() {
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  
  // Join Request Dialog State
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [joinReason, setJoinReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRequests, setUserRequests] = useState<any[]>([])

  useEffect(() => {
    loadAvailableTrips()
    loadUserJoinRequests()
  }, [])

  useEffect(() => {
    filterTrips()
  }, [trips, searchTerm, locationFilter, dateFilter])

  const loadAvailableTrips = async () => {
    try {
      setIsLoading(true)
      
      // Load all confirmed and optimized trips
      const allTrips = await fabricService.getTrips()
      
      // Filter for future trips with available seats
      const today = new Date()
      const availableTrips = allTrips.filter((trip: { departureDate: string | number | Date; status: string }) => {
        const tripDate = new Date(trip.departureDate)
        return tripDate >= today && 
               (trip.status === 'confirmed' || trip.status === 'optimized')
      })
      
      // Group trips by optimization group to show available seats
      const groupedTrips = groupTrips(availableTrips)
      
      setTrips(groupedTrips)
    } catch (error) {
      console.error('Error loading available trips:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserJoinRequests = async () => {
    try {
      const user = authService.getCurrentUser()
      if (user) {
        const requests = await joinRequestService.getJoinRequests({
          requesterId: user.id
        })
        setUserRequests(requests)
      }
    } catch (error) {
      console.error('Error loading join requests:', error)
    }
  }

  const groupTrips = (trips: Trip[]): Trip[] => {
    const groups = new Map<string, Trip[]>()
    
    trips.forEach(trip => {
      if (trip.optimizedGroupId) {
        if (!groups.has(trip.optimizedGroupId)) {
          groups.set(trip.optimizedGroupId, [])
        }
        groups.get(trip.optimizedGroupId)!.push(trip)
      } else {
        // Individual trips
        groups.set(trip.id, [trip])
      }
    })
    
    // Create aggregated trip objects
    const aggregatedTrips: Trip[] = []
    
    groups.forEach((groupTrips, groupId) => {
      const baseTrip = groupTrips[0]
      const vehicle = config.vehicles[baseTrip.vehicleType as keyof typeof config.vehicles] || config.vehicles['car-4']
      const availableSeats = vehicle.capacity - groupTrips.length
      
      if (availableSeats > 0) {
        aggregatedTrips.push({
          ...baseTrip,
          id: groupId,
          userName: `${groupTrips.length} employees`,
          userEmail: '',
          userId: '',
          // Add custom properties for display
          availableSeats,
          totalSeats: vehicle.capacity,
          groupSize: groupTrips.length,
          participants: groupTrips // Keep list of participants
        } as any)
      }
    })
    
    return aggregatedTrips
  }

  const handleRequestToJoin = async () => {
    if (!selectedTrip) return

    setIsSubmitting(true)

    try {
      const user = authService.getCurrentUser()

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to request joining a trip",
          variant: "destructive"
        })
        return
      }

      // For optimized trips, use the first participant's trip ID (real trip ID in database)
      // For individual trips, use the trip ID directly
      const actualTripId = selectedTrip.participants && selectedTrip.participants.length > 0
        ? selectedTrip.participants[0].id
        : selectedTrip.id

      // Create join request
      await joinRequestService.createJoinRequest(
        actualTripId,
        {
          departureLocation: selectedTrip.departureLocation,
          destination: selectedTrip.destination,
          departureDate: selectedTrip.departureDate,
          departureTime: selectedTrip.departureTime,
          optimizedGroupId: selectedTrip.optimizedGroupId
        },
        joinReason
      )
      
      toast({
        title: "Request Submitted",
        description: "Your request to join this trip has been sent to the admin for approval",
      })
      
      // Reload user requests
      await loadUserJoinRequests()
      
      // Close dialog
      setShowJoinDialog(false)
      setSelectedTrip(null)
      setJoinReason("")
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit join request",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasExistingRequest = (tripIdOrGroupId: string): boolean => {
    // Check if any pending request matches this trip ID or has the same optimized group ID
    return userRequests.some(req => {
      // Only check pending requests
      if (req.status !== 'pending') return false

      // Direct match with trip ID
      if (req.tripId === tripIdOrGroupId) return true

      // Match by optimized group ID (for grouped trips)
      if (req.tripDetails?.optimizedGroupId && req.tripDetails.optimizedGroupId === tripIdOrGroupId) {
        return true
      }

      return false
    })
  }

  const hasApprovedRequest = (tripIdOrGroupId: string): boolean => {
    // Check if any approved request matches this trip ID or has the same optimized group ID
    return userRequests.some(req => {
      // Only check approved requests
      if (req.status !== 'approved') return false

      // Direct match with trip ID
      if (req.tripId === tripIdOrGroupId) return true

      // Match by optimized group ID (for grouped trips)
      if (req.tripDetails?.optimizedGroupId && req.tripDetails.optimizedGroupId === tripIdOrGroupId) {
        return true
      }

      return false
    })
  }

  const getRequestStatus = (tripIdOrGroupId: string): string | null => {
    const request = userRequests.find(req =>
      req.tripId === tripIdOrGroupId ||
      (req.tripDetails?.optimizedGroupId && req.tripDetails.optimizedGroupId === tripIdOrGroupId)
    )
    return request ? request.status : null
  }

  const getPendingRequest = (tripIdOrGroupId: string) => {
    return userRequests.find(req =>
      (req.tripId === tripIdOrGroupId ||
       (req.tripDetails?.optimizedGroupId && req.tripDetails.optimizedGroupId === tripIdOrGroupId)) &&
      req.status === 'pending'
    )
  }

  const handleCancelRequest = async (tripId: string) => {
    const request = getPendingRequest(tripId)
    if (!request) return

    try {
      setIsSubmitting(true)
      await joinRequestService.cancelJoinRequest(request.id)
      
      toast({
        title: "Request Cancelled",
        description: "Your join request has been cancelled successfully",
      })
      
      // Reload user requests
      await loadUserJoinRequests()
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel join request",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filterTrips = () => {
    let filtered = [...trips]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(trip => 
        getLocationName(trip.departureLocation).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLocationName(trip.destination).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(trip => 
        trip.departureLocation === locationFilter || trip.destination === locationFilter
      )
    }
    
    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(trip => trip.departureDate === dateFilter)
    }
    
    // Sort by departure date
    filtered.sort((a, b) => 
      new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
    )
    
    setFilteredTrips(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: 'short',
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getNextWeekDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Available Trips</CardTitle>
          <CardDescription>
            View trips with available seats that you can potentially join
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by location..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {Object.entries(config.locations).map(([key, location]) => (
                    <SelectItem key={key} value={key}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                className="w-full md:w-[200px]"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={getNextWeekDate()}
              />
              
              {(searchTerm || locationFilter !== 'all' || dateFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setLocationFilter("all")
                    setDateFilter("")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Trips List */}
          {filteredTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-10 w-10 text-gray-400" />
              <h3 className="mb-1 text-lg font-medium">No Available Trips</h3>
              <p className="text-sm text-gray-500">
                {searchTerm || locationFilter !== 'all' || dateFilter
                  ? "No trips match your filters"
                  : "There are no trips with available seats at the moment"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip: any) => {
                const requestStatus = getRequestStatus(trip.id)
                
                return (
                  <div key={trip.id} className="rounded-lg border p-4 shadow-sm transition-all hover:shadow">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                          </h3>
                          <Badge variant="secondary">
                            {trip.availableSeats} seats available
                          </Badge>
                          {requestStatus && (
                            <Badge 
                              variant={
                                requestStatus === 'approved' ? 'default' :
                                requestStatus === 'pending' ? 'outline' :
                                requestStatus === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                            >
                              Request {requestStatus}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(trip.departureDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{trip.departureTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{trip.groupSize}/{trip.totalSeats} passengers</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              Distance: {calculateDistance(trip.departureLocation, trip.destination)} km
                            </span>
                          </div>
                          {trip.vehicleType && (
                            <Badge variant="outline">
                              {config.vehicles[trip.vehicleType as keyof typeof config.vehicles].name}
                            </Badge>
                          )}
                        </div>
                        
                        {trip.status === 'optimized' && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                             This is an optimized group trip with cost savings
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Show Request to Join button only if no pending/approved request */}
                        {!hasExistingRequest(trip.id) && !hasApprovedRequest(trip.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTrip(trip)
                              setShowJoinDialog(true)
                            }}
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Request to Join
                          </Button>
                        )}

                        {/* Show Request Pending for pending requests */}
                        {hasExistingRequest(trip.id) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                            >
                              Request Pending
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-red-700 hover:bg-red-800 text-white"
                              onClick={() => handleCancelRequest(trip.id)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X className="mr-1 h-3 w-3" />
                                  Cancel Request
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {/* Show Approved status - user should manage from My Trips */}
                        {hasApprovedRequest(trip.id) && (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              disabled
                            >
                              ✓ Approved
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Trip added to your schedule. <br />
                              View in <strong>My Trips</strong> to manage or cancel.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request to Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join Trip</DialogTitle>
            <DialogDescription>
              Submit a request to join this trip. The admin will review and approve your request.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrip && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Route:</span>
                  <span className="font-medium">
                    {getLocationName(selectedTrip.departureLocation)} → {getLocationName(selectedTrip.destination)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(selectedTrip.departureDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTrip.departureTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Seats:</span>
                  <span className="font-medium">{selectedTrip.availableSeats}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Joining (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you need to join this trip..."
                  value={joinReason}
                  onChange={(e) => setJoinReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              {selectedTrip.participants && selectedTrip.participants.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Participants</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedTrip.participants.slice(0, 3).map((p: any) => p.userName).join(', ')}
                    {selectedTrip.participants.length > 3 && ` and ${selectedTrip.participants.length - 3} more`}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowJoinDialog(false)
                setSelectedTrip(null)
                setJoinReason("")
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestToJoin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}