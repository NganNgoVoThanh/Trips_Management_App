// app/admin/approvals/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, CheckCircle, XCircle, Clock, MapPin, Loader2 } from "lucide-react"
import { fabricService, Trip } from "@/lib/mysql-service"
import { emailService } from "@/lib/email-service"
import { authService } from "@/lib/auth-service"
import { getLocationName, formatCurrency } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function ApprovalsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadPendingTrips()
  }, [])

  const loadPendingTrips = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const trips = await fabricService.getTrips({ status: 'pending' })
      setPendingTrips(trips)
    } catch (error) {
      console.error('Error loading pending trips:', error)
      toast({
        title: "Error",
        description: "Failed to load pending trips",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (trip: Trip) => {
    setProcessingId(trip.id)
    try {
      await fabricService.updateTrip(trip.id, { 
        status: 'confirmed',
        notified: true 
      })
      await emailService.sendApprovalNotification(trip)
      
      toast({
        title: "Trip Approved",
        description: `Trip for ${trip.userName} has been approved`,
      })
      
      await loadPendingTrips()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve trip",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (trip: Trip) => {
    setProcessingId(trip.id)
    try {
      await fabricService.updateTrip(trip.id, { 
        status: 'cancelled',
        notified: true 
      })
      await emailService.sendCancellationNotification(trip)
      
      toast({
        title: "Trip Rejected",
        description: `Trip for ${trip.userName} has been rejected`,
      })
      
      await loadPendingTrips()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject trip",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-yellow-600" />
                Pending Approvals
              </h1>
              <p className="text-gray-500">Review and approve trip requests</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-yellow-50">
            {pendingTrips.length} pending
          </Badge>
        </div>

        {pendingTrips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-gray-500">No pending trip approvals</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingTrips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg">{trip.userName}</h3>
                        <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p className="mb-1">{trip.userEmail}</p>
                        <p className="font-mono text-xs">ID: {trip.id.slice(0, 12)}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>Departure: {trip.departureDate} at {trip.departureTime}</span>
                        <span>Return: {trip.returnDate} at {trip.returnTime}</span>
                      </div>
                      
                      {trip.estimatedCost && (
                        <div className="text-sm">
                          <span className="text-gray-600">Estimated Cost: </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(trip.estimatedCost)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(trip)}
                        disabled={processingId === trip.id}
                      >
                        {processingId === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(trip)}
                        disabled={processingId === trip.id}
                      >
                        {processingId === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
