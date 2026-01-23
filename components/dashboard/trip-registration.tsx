"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Clock, MapPin, Car, Loader2 } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { config, getLocationName, calculateDistance, formatCurrency } from "@/lib/config"

export function TripRegistration() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const router = useRouter()
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
    purpose: "",
    ccEmails: [] as string[],
    ccEmailInput: "",
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
        status: 'approved_solo'
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
      // ✅ Use NextAuth session
      const user = session?.user

      if (!user || !user.email || !user.name) {
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

      // Create trip object with email approval fields
      const tripData = {
        departureLocation: formData.departureLocation,
        destination: formData.destination,
        departureDate: formData.departureDate,
        departureTime: formData.departureTime,
        returnDate: formData.returnDate,
        returnTime: formData.returnTime,
        vehicleType: formData.vehicleType,
        purpose: formData.purpose,
        ccEmails: formData.ccEmails,
        estimatedCost: estimatedCost > 0 ? estimatedCost : 0
      }

      console.log('Trip Data to Submit:', tripData)

      // Submit via new email approval endpoint
      const response = await fetch('/api/trips/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
      })

      const result = await response.json()
      console.log('Submission Result:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit trip')
      }

      // Success notification with detailed approval status
      if (result.trip.autoApproved) {
        toast({
          title: "✅ Trip Auto-Approved Successfully!",
          description: (
            <div className="space-y-2">
              <p className="font-semibold">Your trip has been automatically approved (no manager approval required).</p>
              <div className="text-sm">
                <p>📅 Departure: <strong>{formData.departureDate}</strong> at <strong>{formData.departureTime}</strong></p>
                <p>📍 Route: <strong>{formData.departureLocation}</strong> → <strong>{formData.destination}</strong></p>
              </div>
              <p className="text-sm text-green-600 font-medium mt-2">✓ Ready to view in My Trips</p>
            </div>
          ),
          duration: 8000,
        })
      } else if (result.trip.isUrgent) {
        toast({
          title: "⚠️ URGENT Trip Submitted!",
          description: (
            <div className="space-y-2">
              <p className="font-semibold text-orange-600">Urgent approval request sent to your manager and admin.</p>
              <div className="text-sm">
                <p>📅 Departure: <strong>{formData.departureDate}</strong> at <strong>{formData.departureTime}</strong></p>
                <p>📍 Route: <strong>{formData.departureLocation}</strong> → <strong>{formData.destination}</strong></p>
              </div>
              <p className="text-sm text-amber-700 font-medium mt-2">⏰ Departure in less than 24 hours - priority processing</p>
            </div>
          ),
          duration: 8000,
        })
      } else {
        toast({
          title: "✅ Trip Submitted Successfully!",
          description: (
            <div className="space-y-2">
              <p className="font-semibold">Approval email sent to your manager.</p>
              <div className="text-sm">
                <p>📅 Departure: <strong>{formData.departureDate}</strong> at <strong>{formData.departureTime}</strong></p>
                <p>📍 Route: <strong>{formData.departureLocation}</strong> → <strong>{formData.destination}</strong></p>
              </div>
              <p className="text-sm text-blue-600 font-medium mt-2">📧 You will be notified once your manager approves</p>
            </div>
          ),
          duration: 8000,
        })
      }

      // Reset form after successful submission
      setFormData({
        departureLocation: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        returnDate: "",
        returnTime: "",
        vehicleType: "car-4",
        purpose: "",
        ccEmails: [],
        ccEmailInput: "",
        notes: ""
      })

      setAvailableTrips([])

      // Redirect to My Trips to see the newly submitted trip
      setTimeout(() => {
        router.push('/dashboard/trips')
      }, 1500)
      
    } catch (error: any) {
      console.error('=== TRIP SUBMISSION ERROR ===', error)

      // Detailed error notification
      toast({
        title: "❌ Trip Submission Failed",
        description: (
          <div className="space-y-2">
            <p className="font-semibold text-red-600">
              {error.message || "Failed to submit trip request"}
            </p>
            <div className="text-sm">
              <p>📅 Attempted: <strong>{formData.departureDate}</strong> at <strong>{formData.departureTime}</strong></p>
              <p>📍 Route: <strong>{formData.departureLocation}</strong> → <strong>{formData.destination}</strong></p>
            </div>
            <p className="text-sm text-red-700 font-medium mt-2">
              ⚠️ Please check your profile settings and try again, or contact support if the issue persists.
            </p>
          </div>
        ),
        variant: "destructive",
        duration: 8000,
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
              <Label>
                <MapPin className="inline h-4 w-4 mr-1" />
                Departure Location *
              </Label>
              <Select
                value={formData.departureLocation}
                onValueChange={(value) => handleInputChange('departureLocation', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="departure">
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
              <Label>
                <MapPin className="inline h-4 w-4 mr-1" />
                Destination *
              </Label>
              <Select
                value={formData.destination}
                onValueChange={(value) => handleInputChange('destination', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="destination">
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
              <Label>
                <Car className="inline h-4 w-4 mr-1" />
                Preferred Vehicle
              </Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => handleInputChange('vehicleType', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="vehicle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.vehicles).map(([key, vehicle]) => (
                    <SelectItem key={key} value={key}>
                      {vehicle.name} (Max {vehicle.capacity - 1} passengers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">
                Trip Purpose
              </Label>
              <Input
                id="purpose"
                placeholder="Example: Customer meeting, Factory inspection, Training..."
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* CC Emails Section */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails">
              CC Email (Approval Copy Recipients)
            </Label>
            <div className="flex gap-2">
              <Input
                id="ccEmailInput"
                type="email"
                placeholder="Enter email (e.g., colleague@intersnack.com.vn)"
                value={formData.ccEmailInput}
                onChange={(e) => handleInputChange('ccEmailInput', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const email = formData.ccEmailInput.trim()
                    if (email && email.includes('@')) {
                      setFormData(prev => ({
                        ...prev,
                        ccEmails: [...prev.ccEmails, email],
                        ccEmailInput: ''
                      }))
                    }
                  }
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const email = formData.ccEmailInput.trim()
                  if (email && email.includes('@')) {
                    setFormData(prev => ({
                      ...prev,
                      ccEmails: [...prev.ccEmails, email],
                      ccEmailInput: ''
                    }))
                  }
                }}
                disabled={isLoading || !formData.ccEmailInput.trim().includes('@')}
              >
                + Add
              </Button>
            </div>
            {formData.ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.ccEmails.map((email, index) => (
                  <div
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          ccEmails: prev.ccEmails.filter((_, i) => i !== index)
                        }))
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              These people will receive a copy of the approval email sent to your manager
            </p>
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