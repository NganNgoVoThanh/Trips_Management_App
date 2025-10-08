"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Clock, MapPin, Car, Loader2 } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { fabricService, Trip } from "@/lib/mysql-service"
import { config, getLocationName, calculateDistance, formatCurrency } from "@/lib/config"

export function TripRegistration() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
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

  // Memoize estimated cost calculation
  const estimatedCost = useMemo(() => {
    if (formData.departureLocation && formData.destination && formData.departureLocation !== formData.destination && formData.vehicleType) {
      const distance = calculateDistance(formData.departureLocation, formData.destination)
      const vehicle = config.vehicles[formData.vehicleType as keyof typeof config.vehicles]
      if (vehicle) {
        return distance * 2 * vehicle.costPerKm // Round trip
      }
    }
    return 0
  }, [formData.departureLocation, formData.destination, formData.vehicleType])

  // Load available trips with debounce
  const loadAvailableTrips = useCallback(async () => {
    if (!formData.departureDate || !formData.departureLocation || !formData.destination) {
      setAvailableTrips([])
      return
    }

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
      setAvailableTrips([])
    }
  }, [formData.departureDate, formData.departureLocation, formData.destination])

  // Debounced effect for loading trips
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAvailableTrips()
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [loadAvailableTrips])

  // Memoized input change handler
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault() // CRITICAL: Prevent default form submission
    
    // Validate form data
    if (!formData.departureLocation || !formData.destination || 
        !formData.departureDate || !formData.departureTime ||
        !formData.returnDate || !formData.returnTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (formData.departureLocation === formData.destination) {
      toast({
        title: "Validation Error", 
        description: "Departure location and destination cannot be the same",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const user = authService.getCurrentUser()
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to register a trip",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      console.log('=== TRIP SUBMISSION DEBUG ===')
      console.log('User:', user)
      console.log('Form Data:', formData)
      console.log('Estimated Cost:', estimatedCost)

      // Create trip object with all required fields
      const tripData = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        departureLocation: formData.departureLocation,
        destination: formData.destination,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
        returnDate: formData.returnDate,
        returnTime: formData.returnTime,
        vehicleType: formData.vehicleType,
        status: 'pending' as const,
        notified: false,
        estimatedCost: estimatedCost > 0 ? estimatedCost : 0
      }

      console.log('Trip Data to Save:', tripData)

      // Save to database
      const savedTrip = await fabricService.createTrip(tripData)
      console.log('Saved Trip:', savedTrip)

      // Success notification
      toast({
        title: "Trip Registered Successfully",
        description: `Trip ${savedTrip.id} has been submitted for approval`,
      })

      // Reset form after successful submission
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
      
      setAvailableTrips([])
      
    } catch (error: any) {
      console.error('=== TRIP SUBMISSION ERROR ===', error)
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register trip. Please try again.",
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
                Departure Location *
              </Label>
              <Select 
                value={formData.departureLocation} 
                onValueChange={(value) => handleInputChange('departureLocation', value)}
                disabled={isLoading}
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
                Destination *
              </Label>
              <Select 
                value={formData.destination} 
                onValueChange={(value) => handleInputChange('destination', value)}
                disabled={isLoading}
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
                Departure Date *
              </Label>
              <Input
                id="departureDate"
                type="date"
                min={getTomorrowDate()}
                value={formData.departureDate}
                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Departure Time */}
            <div className="space-y-2">
              <Label htmlFor="departureTime">
                <Clock className="inline h-4 w-4 mr-1" />
                Departure Time *
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => handleInputChange('departureTime', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Return Date */}
            <div className="space-y-2">
              <Label htmlFor="returnDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Return Date *
              </Label>
              <Input
                id="returnDate"
                type="date"
                min={formData.departureDate || getTomorrowDate()}
                value={formData.returnDate}
                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Return Time */}
            <div className="space-y-2">
              <Label htmlFor="returnTime">
                <Clock className="inline h-4 w-4 mr-1" />
                Return Time *
              </Label>
              <Input
                id="returnTime"
                type="time"
                value={formData.returnTime}
                onChange={(e) => handleInputChange('returnTime', e.target.value)}
                disabled={isLoading}
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
                onValueChange={(value) => handleInputChange('vehicleType', value)}
                disabled={isLoading}
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
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Cost Estimate */}
          {estimatedCost > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Estimated Cost (Round Trip):</p>
              <p className="text-2xl font-bold">{formatCurrency(estimatedCost)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Distance: {formData.departureLocation && formData.destination ? 
                  `${calculateDistance(formData.departureLocation, formData.destination) * 2} km` : 
                  'N/A'}
              </p>
            </div>
          )}

          {/* Available Trips */}
          {availableTrips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                Similar trips on this date ({availableTrips.length}):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableTrips.map((trip) => (
                  <div key={trip.id} className="text-sm">
                    • {trip.userName} - {trip.departureTime} 
                    ({trip.status === 'optimized' ? 'Optimized' : 'Confirmed'})
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                Your trip may be combined with these for cost optimization
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.departureLocation || !formData.destination}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Trip...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}