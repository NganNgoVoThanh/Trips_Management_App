"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  Loader2,
  Eye,
  MessageSquare,
  AlertCircle
} from "lucide-react"
import { joinRequestService, JoinRequest } from "@/lib/join-request-client"
import { config, getLocationName } from "@/lib/config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function JoinRequestsManagement() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [adminNotes, setAdminNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })

  useEffect(() => {
    loadRequests()
    loadStats()
  }, [statusFilter])

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
      const allRequests = await joinRequestService.getJoinRequests(filters)
      
      // Sort by created date, newest first
      allRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setRequests(allRequests)
    } catch (error) {
      console.error('Error loading join requests:', error)
      toast({
        title: "Error",
        description: "Failed to load join requests",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const requestStats = await joinRequestService.getJoinRequestStats()
      setStats(requestStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    
    setIsProcessing(true)
    
    try {
      await joinRequestService.approveJoinRequest(selectedRequest.id, adminNotes)
      
      toast({
        title: "Request Approved",
        description: `${selectedRequest.requesterName}'s request has been approved`,
      })
      
      // Reload data
      await loadRequests()
      await loadStats()
      
      // Reset state
      setShowActionDialog(false)
      setSelectedRequest(null)
      setAdminNotes("")
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve request",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    
    if (!adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      })
      return
    }
    
    setIsProcessing(true)
    
    try {
      await joinRequestService.rejectJoinRequest(selectedRequest.id, adminNotes)
      
      toast({
        title: "Request Rejected",
        description: `${selectedRequest.requesterName}'s request has been rejected`,
      })
      
      // Reload data
      await loadRequests()
      await loadStats()
      
      // Reset state
      setShowActionDialog(false)
      setSelectedRequest(null)
      setAdminNotes("")
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject request",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const openActionDialog = (request: JoinRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setActionType(type)
    setShowActionDialog(true)
    setAdminNotes("")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return ''
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
          <CardTitle>Join Requests Management</CardTitle>
          <CardDescription>
            Review and process employee requests to join existing trips
          </CardDescription>
          
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={statusFilter} className="mt-6">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="mb-2 h-10 w-10 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium">No Requests</h3>
                  <p className="text-sm text-gray-500">
                    No {statusFilter !== 'all' ? statusFilter : ''} join requests found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-4 shadow-sm">
                      <div className="flex flex-col justify-between gap-4 md:flex-row">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{request.requesterName}</span>
                            <Badge variant="outline" className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                            {request.requesterDepartment && (
                              <Badge variant="secondary">
                                {request.requesterDepartment}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {getLocationName(request.tripDetails.departureLocation)} → 
                                {getLocationName(request.tripDetails.destination)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(request.tripDetails.departureDate)}</span>
                              <Clock className="h-4 w-4 ml-2" />
                              <span>{request.tripDetails.departureTime}</span>
                            </div>
                          </div>
                          
                          {request.reason && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <MessageSquare className="h-4 w-4 inline mr-1" />
                              {request.reason}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            Requested: {formatDateTime(request.createdAt)}
                            {request.processedAt && (
                              <span> â€¢ Processed: {formatDateTime(request.processedAt)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {request.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(request, 'approve')}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(request, 'reject')}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Dialog>
                              <Button size="sm" variant="outline" asChild>
                                <DialogTrigger>
                                  <Eye className="mr-1 h-4 w-4" />
                                  View Details
                                </DialogTrigger>
                              </Button>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Request Details</DialogTitle>
                                  <DialogDescription>
                                    View complete information about this join request
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Requester</Label>
                                    <p className="text-sm">{request.requesterName} ({request.requesterEmail})</p>
                                  </div>
                                  <div>
                                    <Label>Trip Details</Label>
                                    <p className="text-sm">
                                      {getLocationName(request.tripDetails.departureLocation)} → 
                                      {getLocationName(request.tripDetails.destination)}
                                    </p>
                                    <p className="text-sm">
                                      {formatDate(request.tripDetails.departureDate)} at {request.tripDetails.departureTime}
                                    </p>
                                  </div>
                                  {request.reason && (
                                    <div>
                                      <Label>Reason</Label>
                                      <p className="text-sm">{request.reason}</p>
                                    </div>
                                  )}
                                  {request.adminNotes && (
                                    <div>
                                      <Label>Admin Notes</Label>
                                      <p className="text-sm">{request.adminNotes}</p>
                                    </div>
                                  )}
                                  {request.processedBy && (
                                    <div>
                                      <Label>Processed By</Label>
                                      <p className="text-sm">
                                        Admin ID: {request.processedBy}
                                        <br />
                                        Date: {formatDateTime(request.processedAt!)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Join Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Approving this request will add the employee to the trip.'
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Request Details</AlertTitle>
                <AlertDescription>
                  <strong>{selectedRequest.requesterName}</strong> wants to join the trip from{' '}
                  <strong>{getLocationName(selectedRequest.tripDetails.departureLocation)}</strong> to{' '}
                  <strong>{getLocationName(selectedRequest.tripDetails.destination)}</strong> on{' '}
                  <strong>{formatDate(selectedRequest.tripDetails.departureDate)}</strong>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="adminNotes">
                  Admin Notes {actionType === 'reject' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="adminNotes"
                  placeholder={
                    actionType === 'approve' 
                      ? "Optional notes about the approval..."
                      : "Reason for rejection (required)..."
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowActionDialog(false)
                setSelectedRequest(null)
                setAdminNotes("")
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={actionType === 'approve' ? handleApprove : handleReject}
              disabled={isProcessing}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve Request' : 'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}