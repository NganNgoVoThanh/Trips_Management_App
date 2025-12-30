// app/admin/manual-override/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  TrendingUp
} from "lucide-react"
import { authService } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ExpiredTrip {
  id: string
  user_name: string
  user_email: string
  departure_location: string
  destination: string
  departure_date: string
  departure_time: string
  return_date: string
  return_time: string
  purpose?: string
  estimated_cost?: number
  vehicle_type?: string
  created_at: string
  manager_email?: string
  manager_name?: string
  expired_notification_sent: boolean
  expired_notified_at?: string
  hours_old: number
}

interface Statistics {
  total_expired: number
  notified_count: number
  pending_notification_count: number
}

export default function ManualOverridePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [trips, setTrips] = useState<ExpiredTrip[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [processingTripId, setProcessingTripId] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<ExpiredTrip | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const response = await fetch('/api/admin/manual-override')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load data')
      }

      setTrips(data.trips || [])
      setStatistics(data.statistics || { total_expired: 0, notified_count: 0, pending_notification_count: 0 })
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load expired trips",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openDialog = (trip: ExpiredTrip, action: 'approve' | 'reject') => {
    setSelectedTrip(trip)
    setActionType(action)
    setReason('')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedTrip || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this action",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessingTripId(selectedTrip.id)

      const response = await fetch('/api/admin/manual-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          action: actionType,
          reason: reason.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process override')
      }

      toast({
        title: actionType === 'approve' ? "✅ Trip Approved" : "❌ Trip Rejected",
        description: `Trip ${selectedTrip.id.slice(0, 8)} has been ${actionType}d successfully`,
      })

      setDialogOpen(false)
      setSelectedTrip(null)
      setReason('')

      // Reload data
      await loadData()
    } catch (error: any) {
      console.error('Error processing override:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to process override',
        variant: "destructive"
      })
    } finally {
      setProcessingTripId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    // Handle both "HH:MM:SS" and "HH:MM" formats
    const parts = timeStr.split(':')
    return `${parts[0]}:${parts[1]}`
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

      <div className="container mx-auto p-6 pb-8 space-y-6">
        {/* Header */}
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
                <AlertTriangle className="h-6 w-6 text-orange-600" />
                Manual Override
              </h1>
              <p className="text-gray-500">Process trips with expired approval links</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expired</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_expired}</div>
                <p className="text-xs text-muted-foreground">Trips pending &gt;48h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notified</CardTitle>
                <Mail className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.notified_count}</div>
                <p className="text-xs text-muted-foreground">Emails already sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Notification</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.pending_notification_count}</div>
                <p className="text-xs text-muted-foreground">Awaiting notification</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trips List */}
        {trips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <h3 className="text-lg font-medium">No trips need processing</h3>
              <p className="text-gray-500">All trips have been approved on time</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Trip Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{trip.user_name}</h3>
                            {trip.expired_notification_sent ? (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Mail className="h-3 w-3 mr-1" />
                                Notified
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Not Notified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{trip.user_email}</p>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {trip.hours_old}h expired
                        </Badge>
                      </div>

                      {/* Trip Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Route</p>
                            <p className="text-gray-600">{trip.departure_location} → {trip.destination}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Departure</p>
                            <p className="text-gray-600">
                              {formatDate(trip.departure_date)} at {formatTime(trip.departure_time)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Return</p>
                            <p className="text-gray-600">
                              {formatDate(trip.return_date)} at {formatTime(trip.return_time)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Manager</p>
                            <p className="text-gray-600">
                              {trip.manager_name || 'N/A'}
                              {trip.manager_email && (
                                <span className="text-xs text-gray-500 block">{trip.manager_email}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Purpose */}
                      {trip.purpose && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 mb-1">Purpose:</p>
                          <p className="text-sm text-gray-700">{trip.purpose}</p>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Trip ID: {trip.id.slice(0, 12)}...</span>
                        {trip.vehicle_type && <span>Vehicle: {trip.vehicle_type}</span>}
                        {trip.estimated_cost && (
                          <span className="font-medium text-blue-600">
                            Est. Cost: {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(trip.estimated_cost)}
                          </span>
                        )}
                      </div>

                      {/* Notification Status */}
                      {trip.expired_notification_sent && trip.expired_notified_at && (
                        <div className="text-xs text-blue-600">
                          ✓ Email sent at {new Date(trip.expired_notified_at).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => openDialog(trip, 'approve')}
                        disabled={processingTripId === trip.id}
                        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                        size="sm"
                      >
                        {processingTripId === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => openDialog(trip, 'reject')}
                        disabled={processingTripId === trip.id}
                        variant="destructive"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {processingTripId === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approve Trip
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject Trip
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTrip && (
                <div className="space-y-2 mt-2">
                  <p><strong>User:</strong> {selectedTrip.user_name} ({selectedTrip.user_email})</p>
                  <p><strong>Route:</strong> {selectedTrip.departure_location} → {selectedTrip.destination}</p>
                  <p><strong>Date:</strong> {formatDate(selectedTrip.departure_date)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for {actionType === 'approve' ? 'approval' : 'rejection'} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  actionType === 'approve'
                    ? "E.g., Manager confirmed verbally, Approved due to urgent business need..."
                    : "E.g., Trip not necessary, Violates company policy..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                This reason will be included in the email notification to the user and logged in the audit trail.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processingTripId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason.trim() || processingTripId !== null}
              className={
                actionType === 'approve'
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processingTripId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : actionType === 'approve' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
