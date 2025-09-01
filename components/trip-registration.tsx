"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Clock, MapPin, Car, Loader2 } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { fabricService, Trip } from "@/lib/fabric-service"
import { config, getLocationName, calculateDistance, formatCurrency } from "@/lib/config"

export function TripRegistration() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([])
  
  const [formData, setFormData] = useState({
    departureLocation: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    vehicleType: "car-4",
    notes: ""
  })

  useEffect(() => {
    loadAvailableTrips()
  }, [formData.departureDate, formData.departureLocation, formData.destination])

  useEffect(() => {
    calculateEstimatedCost()
  }, [formData.departureLocation, formData.destination, formData.vehicleType])

  const loadAvailableTrips = async () => {
    if (formData.departureDate) {
      try {
        const trips = await fabricService.getTrips({
          status: 'confirmed'
        })
        
        const filtered = trips.filter(trip => 
          trip.departureDate === formData.departureDate &&
          trip.departureLocation === formData.departureLocation &&
          trip.destination === formData.destination
        )
        
        setAvailableTrips(filtered)
      } catch (error) {
        console.error('Error loading available trips:', error)
      }
    }
  }

  const calculateEstimatedCost = () => {
    if (formData.departureLocation && formData.destination) {
      const distance = calculateDistance(formData.departureLocation, formData.destination)
      const vehicle = config.vehicles[formData.vehicleType as keyof typeof config.vehicles]
      setEstimatedCost(distance * 2 * vehicle.costPerKm) // Round trip
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const user = authService.getCurrentUser()
      
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to register a trip",
          variant: "destructive"
        })
        return
      }

      // Create trip in database
      const trip = await fabricService.createTrip({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        ...formData,
        status: 'pending',
        notified: false,
        estimatedCost
      })

      toast({
        title: "Trip Registered Successfully",
        description: "Your trip request has been submitted for approval",
      })

      // Reset form
      setFormData({
        departureLocation: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        returnDate: "",
        returnTime: "",
        vehicleType: "car-4",
        notes: ""
      })
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register trip",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Trip</CardTitle>
        <CardDescription>
          Submit your business trip details for approval and optimization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Departure Location */}
            <div className="space-y-2">
              <Label htmlFor="departure">
                <MapPin className="inline h-4 w-4 mr-1" />
                Departure Location
              </Label>
              <Select 
                value={formData.departureLocation} 
                onValueChange={(value) => setFormData({...formData, departureLocation: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select departure location" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.locations).map(([key, location]) => (
                    <SelectItem key={key} value={key}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination">
                <MapPin className="inline h-4 w-4 mr-1" />
                Destination
              </Label>
              <Select 
                value={formData.destination} 
                onValueChange={(value) => setFormData({...formData, destination: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.locations).map(([key, location]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      disabled={key === formData.departureLocation}
                    >
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Departure Date */}
            <div className="space-y-2">
              <Label htmlFor="departureDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Departure Date
              </Label>
              <Input
                id="departureDate"
                type="date"
                min={getTomorrowDate()}
                value={formData.departureDate}
                onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                required
              />
            </div>

            {/* Departure Time */}
            <div className="space-y-2">
              <Label htmlFor="departureTime">
                <Clock className="inline h-4 w-4 mr-1" />
                Departure Time
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                required
              />
            </div>

            {/* Return Date */}
            <div className="space-y-2">
              <Label htmlFor="returnDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Return Date
              </Label>
              <Input
                id="returnDate"
                type="date"
                min={formData.departureDate || getTomorrowDate()}
                value={formData.returnDate}
                onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                required
              />
            </div>

            {/* Return Time */}
            <div className="space-y-2">
              <Label htmlFor="returnTime">
                <Clock className="inline h-4 w-4 mr-1" />
                Return Time
              </Label>
              <Input
                id="returnTime"
                type="time"
                value={formData.returnTime}
                onChange={(e) => setFormData({...formData, returnTime: e.target.value})}
                required
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <Label htmlFor="vehicle">
                <Car className="inline h-4 w-4 mr-1" />
                Preferred Vehicle
              </Label>
              <Select 
                value={formData.vehicleType} 
                onValueChange={(value) => setFormData({...formData, vehicleType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.vehicles).map(([key, vehicle]) => (
                    <SelectItem key={key} value={key}>
                      {vehicle.name} (Max {vehicle.capacity} passengers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes or special requirements"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          {/* Cost Estimate */}
          {estimatedCost > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Estimated Cost (Round Trip):</p>
              <p className="text-2xl font-bold">{formatCurrency(estimatedCost)}</p>
            </div>
          )}

          {/* Available Trips */}
          {availableTrips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                Similar trips on this date:
              </p>
              <div className="space-y-1">
                {availableTrips.map((trip) => (
                  <div key={trip.id} className="text-sm">
                    • {trip.userName} - {trip.departureTime} 
                    ({trip.status === 'optimized' ? 'Optimized' : 'Pending'})
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                Your trip may be combined with these for cost optimization
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Trip Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}