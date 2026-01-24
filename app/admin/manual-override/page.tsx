// app/admin/manual-override/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  History,
  AlertCircle,
  ShieldAlert,
  CalendarX
} from "lucide-react"
import { useSession } from "next-auth/react"
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface ExpiredTrip {
  id: string
  user_name: string
  user_email: string
  user_id: string
  departure_location: string
  destination: string
  departure_date: string
  departure_time: string
  return_date: string
  return_time: string
  purpose?: string
  estimated_cost?: number
  vehicle_type?: string
  status: string
  created_at: string
  manager_email?: string
  manager_name?: string
  user_status?: string
  expired_notification_sent: boolean
  expired_notified_at?: string
  hours_old: number
  is_past_departure: boolean | number
  is_urgent?: boolean | number
  hours_until_departure?: number
}

interface Statistics {
  total_trips: number
  urgent_count: number
  expired_count: number
  notified_count: number
  pending_notification_count: number
  past_departure_count: number
}

interface OverrideHistoryEntry {
  id: number
  trip_id: string
  action_type: 'approve' | 'reject'
  admin_email: string
  admin_name: string
  reason: string
  original_status: string
  new_status: string
  user_email: string
  user_name: string
  created_at: string
  departure_location?: string
  destination?: string
  departure_date?: string
}

export default function ManualOverridePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [trips, setTrips] = useState<ExpiredTrip[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [overrideHistory, setOverrideHistory] = useState<OverrideHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingTripId, setProcessingTripId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<ExpiredTrip | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')

  // Force override dialog (for past departure)
  const [forceDialogOpen, setForceDialogOpen] = useState(false)
  const [forceConfirmed, setForceConfirmed] = useState(false)
  const [pendingForceOverride, setPendingForceOverride] = useState<{
    tripId: string
    action: string
    reason: string
  } | null>(null)

  // Error dialog
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDetails, setErrorDetails] = useState<{
    title: string
    message: string
    details?: string
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Check NextAuth session
      if (!session?.user || session.user.role !== 'admin') {
        console.log('❌ Not admin, redirecting');
        router.push('/dashboard')
        return
      }

      console.log('✅ Admin verified for Override page');
      const response = await fetch('/api/admin/manual-override')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load data')
      }

      setTrips(data.trips || [])
      setStatistics(data.statistics || {
        total_trips: 0,
        urgent_count: 0,
        expired_count: 0,
        notified_count: 0,
        pending_notification_count: 0,
        past_departure_count: 0
      })
      setOverrideHistory(data.overrideHistory || [])
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

  const handleSubmit = async (forceOverride: boolean = false) => {
    if (!selectedTrip || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for this action",
        variant: "destructive"
      })
      return
    }

    if (reason.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Reason must be at least 5 characters",
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
          reason: reason.trim(),
          forceOverride
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 422 && data.requiresForce) {
          // Departure date has passed, show force confirmation
          setDialogOpen(false)
          setPendingForceOverride({
            tripId: selectedTrip.id,
            action: actionType,
            reason: reason.trim()
          })
          setForceConfirmed(false)
          setForceDialogOpen(true)
          return
        }

        if (response.status === 409) {
          // Trip already processed (concurrent modification)
          setErrorDetails({
            title: 'Trip Already Processed',
            message: data.details || 'This trip has already been processed by another admin.',
            details: `Current status: ${data.currentStatus}`
          })
          setErrorDialogOpen(true)
          setDialogOpen(false)
          await loadData()
          return
        }

        if (response.status === 400 && data.userStatus) {
          // User is inactive
          setErrorDetails({
            title: 'User Account Inactive',
            message: data.details || 'The user account is inactive.',
            details: `User status: ${data.userStatus}`
          })
          setErrorDialogOpen(true)
          setDialogOpen(false)
          return
        }

        throw new Error(data.error || 'Failed to process override')
      }

      toast({
        title: actionType === 'approve' ? "Trip Approved" : "Trip Rejected",
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

  const handleForceOverride = async () => {
    if (!pendingForceOverride || !forceConfirmed) return

    try {
      setProcessingTripId(pendingForceOverride.tripId)

      const response = await fetch('/api/admin/manual-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: pendingForceOverride.tripId,
          action: pendingForceOverride.action,
          reason: pendingForceOverride.reason,
          forceOverride: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process force override')
      }

      toast({
        title: "Trip Force Approved",
        description: `Trip has been force approved despite past departure date`,
      })

      setForceDialogOpen(false)
      setPendingForceOverride(null)
      setForceConfirmed(false)

      await loadData()
    } catch (error: any) {
      console.error('Error processing force override:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to process force override',
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

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    const parts = timeStr.split(':')
    return `${parts[0]}:${parts[1]}`
  }

  const isPastDeparture = (trip: ExpiredTrip) => {
    return trip.is_past_departure === true || trip.is_past_departure === 1
  }

  const isUrgentTrip = (trip: ExpiredTrip) => {
    return trip.is_urgent === true || trip.is_urgent === 1 || trip.status === 'pending_urgent'
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_trips}</div>
                <p className="text-xs text-muted-foreground">Need approval</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700">Urgent Trips</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.urgent_count}</div>
                <p className="text-xs text-muted-foreground">Departure &lt;24h</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Expired Approvals</CardTitle>
                <Mail className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics.expired_count}</div>
                <p className="text-xs text-muted-foreground">Pending &gt;48h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Past Departure</CardTitle>
                <CalendarX className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.past_departure_count}</div>
                <p className="text-xs text-muted-foreground">Need force approval</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs: Pending Trips / History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending ({trips.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History ({overrideHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Trips Tab */}
          <TabsContent value="pending" className="mt-4">
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
                  <Card
                    key={trip.id}
                    className={`hover:shadow-md transition-shadow ${
                      isUrgentTrip(trip)
                        ? 'border-l-4 border-l-red-500'
                        : isPastDeparture(trip)
                        ? 'border-l-4 border-l-gray-400'
                        : ''
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          {/* Trip Header */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-lg">{trip.user_name}</h3>
                                {isUrgentTrip(trip) && (
                                  <Badge className="bg-red-600 text-white animate-pulse">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    URGENT
                                    {trip.hours_until_departure !== undefined && trip.hours_until_departure > 0 && (
                                      <span className="ml-1">({trip.hours_until_departure}h left)</span>
                                    )}
                                  </Badge>
                                )}
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
                                {isPastDeparture(trip) && (
                                  <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                                    <CalendarX className="h-3 w-3 mr-1" />
                                    Past Departure
                                  </Badge>
                                )}
                                {trip.user_status && trip.user_status !== 'active' && (
                                  <Badge variant="destructive">
                                    <ShieldAlert className="h-3 w-3 mr-1" />
                                    User {trip.user_status}
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

                          {/* Warning for urgent trip */}
                          {isUrgentTrip(trip) && !isPastDeparture(trip) && (
                            <Alert variant="destructive" className="bg-red-50 border-red-300">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <AlertTitle className="text-red-800">Urgent Trip - Immediate Action Required</AlertTitle>
                              <AlertDescription className="text-red-700">
                                Departure is scheduled in less than 24 hours ({formatDate(trip.departure_date)} at {formatTime(trip.departure_time)}).
                                {trip.hours_until_departure !== undefined && trip.hours_until_departure > 0 && (
                                  <span className="font-semibold"> Only {trip.hours_until_departure} hours remaining!</span>
                                )}
                                {' '}Please process this approval immediately.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Warning for past departure */}
                          {isPastDeparture(trip) && (
                            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertTitle className="text-amber-800">Departure Date Passed</AlertTitle>
                              <AlertDescription className="text-amber-700">
                                The scheduled departure ({formatDate(trip.departure_date)} at {formatTime(trip.departure_time)}) has already passed.
                                Approving this trip will require force confirmation.
                              </AlertDescription>
                            </Alert>
                          )}

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
                                <p className={`${isPastDeparture(trip) ? 'text-red-600 line-through' : 'text-gray-600'}`}>
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
                              Email sent at {formatDateTime(trip.expired_notified_at)}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => openDialog(trip, 'approve')}
                            disabled={processingTripId === trip.id || (!!trip.user_status && trip.user_status !== 'active')}
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
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {overrideHistory.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <h3 className="text-lg font-medium">No override history</h3>
                  <p className="text-gray-500">No manual overrides have been performed yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Override History
                  </CardTitle>
                  <CardDescription>Last 20 manual override actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overrideHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-lg border ${
                          entry.action_type === 'approve'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {entry.action_type === 'approve' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">
                                {entry.action_type === 'approve' ? 'Approved' : 'Rejected'}
                              </span>
                              <span className="text-gray-500">by</span>
                              <span className="font-medium">{entry.admin_name || entry.admin_email}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">User:</span> {entry.user_name} ({entry.user_email})
                            </div>
                            {entry.departure_location && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Route:</span> {entry.departure_location} → {entry.destination}
                                {entry.departure_date && ` (${formatDate(entry.departure_date)})`}
                              </div>
                            )}
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Reason:</span> {entry.reason}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              Trip ID: {entry.trip_id.slice(0, 12)}...
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(entry.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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

          {selectedTrip && isPastDeparture(selectedTrip) && actionType === 'approve' && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Warning</AlertTitle>
              <AlertDescription className="text-amber-700">
                The departure date has already passed. You will need to confirm force approval.
              </AlertDescription>
            </Alert>
          )}

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
                Minimum 5 characters. This reason will be included in the email notification to the user and logged in the audit trail.
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
              onClick={() => handleSubmit(false)}
              disabled={!reason.trim() || reason.trim().length < 5 || processingTripId !== null}
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

      {/* Force Override Dialog */}
      <Dialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Force Approval Required
            </DialogTitle>
            <DialogDescription>
              The departure date for this trip has already passed. Approving this trip is unusual and will be logged as a force override.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              This action will be specially logged and may be reviewed by auditors.
            </AlertDescription>
          </Alert>

          <div className="flex items-start space-x-3 py-4">
            <Checkbox
              id="forceConfirm"
              checked={forceConfirmed}
              onCheckedChange={(checked) => setForceConfirmed(checked as boolean)}
            />
            <Label
              htmlFor="forceConfirm"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand that the departure date has passed and I want to force approve this trip anyway. This action will be logged as a special override.
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setForceDialogOpen(false)
                setPendingForceOverride(null)
                setForceConfirmed(false)
              }}
              disabled={processingTripId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForceOverride}
              disabled={!forceConfirmed || processingTripId !== null}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {processingTripId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldAlert className="h-4 w-4 mr-2" />
              )}
              Force Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorDetails?.title || 'Error'}
            </DialogTitle>
            <DialogDescription>
              {errorDetails?.message}
            </DialogDescription>
          </DialogHeader>

          {errorDetails?.details && (
            <div className="p-3 bg-gray-100 rounded-lg text-sm font-mono">
              {errorDetails.details}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
