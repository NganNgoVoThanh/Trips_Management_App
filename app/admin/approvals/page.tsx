// app/admin/approvals/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Clock, MapPin, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { getLocationName, formatCurrency } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { formatDate, formatTime } from "@/lib/utils"
import { useSession } from "next-auth/react"

export default function ApprovalsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only load data when session is ready
    if (status === 'loading') {
      // Session still loading, do nothing
      return
    }

    if (status === 'unauthenticated' || !session?.user || session.user.role !== 'admin') {
      // Not authenticated or not admin, redirect
      console.log('❌ Not admin, redirecting to dashboard');
      router.push('/dashboard')
      return
    }

    // Session loaded and user is admin, load data
    loadPendingTrips()
  }, [session, status, router]) // Add proper dependencies

  const loadPendingTrips = async () => {
    try {
      // Session already checked in useEffect, safe to proceed
      if (!session?.user) return

      console.log('✅ Loading pending trips for admin:', session.user.email);

      // Check if user is Location Admin
      const isLocationAdmin = session.user.adminType === 'location_admin' && session.user.adminLocationId

      let allTrips: Trip[] = []

      if (isLocationAdmin) {
        // Location Admin: Fetch filtered trips via API
        const response = await fetch('/api/admin/location-trips')
        if (response.ok) {
          const data = await response.json()
          allTrips = data.trips || []
        } else {
          throw new Error('Failed to fetch location trips')
        }
      } else {
        // Super Admin: Fetch all trips
        allTrips = await fabricService.getTrips()
      }

      // Get trips pending manager approval
      const pendingTrips = allTrips.filter((t: Trip) =>
        t.status === 'pending_approval' || t.status === 'pending_urgent'
      )
      setPendingTrips(pendingTrips)
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

  // ❌ REMOVED: Admin should NOT approve/reject from this page
  // Admin should only approve/reject via Manual Override page for proper audit trail
  // This ensures:
  // - Proper status: 'approved_solo' instead of 'approved' (different from manager approval)
  // - Required reason/notes for audit
  // - Full logging in admin_override_log table
  // - Clear distinction between manager approval (green) and admin override (white)

  const handleGoToOverride = () => {
    router.push('/admin/manual-override')
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
              <p className="text-gray-500">View pending trip requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-50">
              {pendingTrips.length} pending
            </Badge>
            <Button
              onClick={handleGoToOverride}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Go to Manual Override
            </Button>
          </div>
        </div>

        {/* Alert: Admin must use Manual Override */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Admin Override Required</AlertTitle>
          <AlertDescription className="text-blue-700">
            This page is for viewing only. To approve or reject trips, please use the{" "}
            <button
              onClick={handleGoToOverride}
              className="underline font-medium hover:text-blue-900"
            >
              Manual Override
            </button>{" "}
            page. This ensures proper audit logging and maintains clear distinction between manager approvals and admin overrides.
          </AlertDescription>
        </Alert>

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
                        <span>Departure: {formatDate(trip.departureDate)} at {trip.departureTime}</span>
                        <span>Return: {formatDate(trip.returnDate)} at {trip.returnTime}</span>
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
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleGoToOverride}
                      >
                        <Clock className="mr-1 h-4 w-4" />
                        Process Override
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
