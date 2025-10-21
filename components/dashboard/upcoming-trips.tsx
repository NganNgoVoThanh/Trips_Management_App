"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Calendar, Clock, MapPin, Car, Users, Loader2 } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { authService } from "@/lib/auth-service"
import { config, getLocationName, formatCurrency } from "@/lib/config"
import { formatDateVN, formatDateLongVN } from "@/lib/date-utils"
import { emailService } from "@/lib/email-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function UpcomingTrips() {
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      const user = authService.getCurrentUser()
      
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to view your trips",
          variant: "destructive"
        })
        return
      }

      const userTrips = await fabricService.getTrips({ 
        userId: user.id 
      })
      
      // Filter for upcoming trips only
      const today = new Date()
      const upcoming = userTrips.filter((trip: { departureDate: string | number | Date; status: string }) => {
        const tripDate = new Date(trip.departureDate)
        return tripDate >= today && trip.status !== 'cancelled'
      })
      
      // Sort by departure date
      upcoming.sort((a: { departureDate: string | number | Date }, b: { departureDate: string | number | Date }) => 
        new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
      )
      
      setTrips(upcoming)
    } catch (error) {
      console.error('Error loading trips:', error)
      toast({
        title: "Error",
        description: "Failed to load your trips",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelTrip = async () => {
    if (!selectedTrip) return
    
    setCancellingTripId(selectedTrip.id)
    
    try {
      // Update trip status
      await fabricService.updateTrip(selectedTrip.id, {
        status: 'cancelled'
      })
      
      // Send cancellation email
      await emailService.sendCancellationNotification(selectedTrip)
      
      toast({
        title: "Trip Cancelled",
        description: "Your trip has been cancelled successfully",
      })
      
      // Reload trips
      await loadTrips()
      setShowCancelDialog(false)
      setSelectedTrip(null)
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel trip",
        variant: "destructive"
      })
    } finally {
      setCancellingTripId(null)
    }
  }

  // Remove old formatDate - now using formatDateLongVN from date-utils

  const getDaysUntilTrip = (dateString: string) => {
    const tripDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    tripDate.setHours(0, 0, 0, 0)
    
    const diffTime = tripDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 0) return 'Past'
    return `In ${diffDays} days`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
      case 'optimized':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400'
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Trips</CardTitle>
          <CardDescription>Manage your scheduled business trips</CardDescription>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-2 h-10 w-10 text-gray-400" />
              <h3 className="mb-1 text-lg font-medium">No Upcoming Trips</h3>
              <p className="text-sm text-gray-500">
                You don't have any scheduled trips at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <div key={trip.id} className="rounded-lg border p-4 shadow-sm transition-all hover:shadow">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                        <h3 className="font-medium break-words max-w-full">
                          {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(trip.status)}
                        >
                          {trip.status === 'optimized' ? 'Optimized' : 
                           trip.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1 min-w-fit">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="break-words">{formatDateLongVN(trip.departureDate)}</span>
                          <Badge variant="secondary" className="ml-1 whitespace-nowrap">
                            {getDaysUntilTrip(trip.departureDate)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap min-w-fit">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{trip.departureTime}</span>
                          {trip.originalDepartureTime && trip.originalDepartureTime !== trip.departureTime && (
                            <span className="text-amber-600 whitespace-nowrap">
                              (was {trip.originalDepartureTime})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1 min-w-fit">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="break-words">Return: {formatDateLongVN(trip.returnDate)} at {trip.returnTime}</span>
                        </div>
                        {trip.vehicleType && (
                          <div className="flex items-center gap-1 min-w-fit">
                            <Car className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">{config.vehicles[trip.vehicleType as keyof typeof config.vehicles].name}</span>
                          </div>
                        )}
                      </div>
                      
                      {trip.estimatedCost && (
                        <div className="text-sm font-medium">
                          Estimated Cost: {formatCurrency(trip.estimatedCost)}
                        </div>
                      )}
                      
                      {trip.optimizedGroupId && (
                        <Alert className="mt-2">
                          <Users className="h-4 w-4" />
                          <AlertTitle>Combined Trip</AlertTitle>
                          <AlertDescription>
                            This trip has been optimized and combined with other employees' trips for cost savings.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Trip Details</DialogTitle>
                            <DialogDescription>
                              Complete information about your business trip
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <h4 className="mb-2 font-medium">Route Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <span className="text-gray-500">From:</span>
                                  <span className="break-words text-right">{getLocationName(trip.departureLocation)}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <span className="text-gray-500">To:</span>
                                  <span className="break-words text-right">{getLocationName(trip.destination)}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="mb-2 font-medium">Schedule</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <span className="text-gray-500">Departure:</span>
                                  <span className="break-words text-right">{formatDateVN(trip.departureDate)} at {trip.departureTime}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <span className="text-gray-500">Return:</span>
                                  <span className="break-words text-right">{formatDateVN(trip.returnDate)} at {trip.returnTime}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="mb-2 font-medium">Status & Cost</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Status:</span>
                                  <Badge variant="outline" className={getStatusColor(trip.status)}>
                                    {trip.status}
                                  </Badge>
                                </div>
                                {trip.estimatedCost && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Estimated Cost:</span>
                                    <span className="font-medium">{formatCurrency(trip.estimatedCost)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="mb-2 font-medium">Trip ID</h4>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{trip.id}</code>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {trip.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTrip(trip)
                            setShowCancelDialog(true)
                          }}
                          disabled={cancellingTripId === trip.id}
                        >
                          {cancellingTripId === trip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Cancel'
                          )}
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this trip? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="py-4 space-y-2">
              <p className="text-sm break-words">
                <strong>Trip:</strong> {getLocationName(selectedTrip.departureLocation)} → {getLocationName(selectedTrip.destination)}
              </p>
              <p className="text-sm">
                <strong>Date:</strong> {formatDateVN(selectedTrip.departureDate)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelDialog(false)
                setSelectedTrip(null)
              }}
            >
              Keep Trip
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelTrip}
              disabled={!!cancellingTripId}
            >
              {cancellingTripId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Trip'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
