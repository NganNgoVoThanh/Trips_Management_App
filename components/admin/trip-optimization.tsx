// trip-optimization.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  RefreshCw, 
  Check, 
  X, 
  Loader2,
  TrendingDown
} from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { calculateDistance, getLocationName, formatCurrency, config } from "@/lib/config"
import { aiOptimizer, OptimizationProposal } from "@/lib/ai-optimizer"
import { authService } from "@/lib/auth-service"

interface TripOptimizationProps {
  onOptimizationChange?: () => void
}

export function TripOptimization({ onOptimizationChange }: TripOptimizationProps = {}) {
  const { toast } = useToast()
  const [proposals, setProposals] = useState<OptimizationProposal[]>([])
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Load approved trips ready for optimization
      // Include: 'approved', 'auto_approved', 'approved_solo'
      const allTrips = await fabricService.getTrips({ includeTemp: false })
      const eligibleStatuses = ['approved', 'auto_approved', 'approved_solo']
      const trips = allTrips.filter(t => eligibleStatuses.includes(t.status))

      console.log(`📊 Found ${trips.length} trips eligible for optimization (statuses: ${trips.map(t => t.status).join(', ')})`)
      setPendingTrips(trips)
      
      // Load existing proposals
      const groups = await fabricService.getOptimizationGroups('proposed')
      
      const existingProposals: OptimizationProposal[] = []
      for (const group of groups) {
        const groupTempTrips = await fabricService.getTempTripsByGroupId(group.id)
        
        if (groupTempTrips.length > 0) {
          const totalDistance = groupTempTrips[0].departureLocation && groupTempTrips[0].destination
            ? calculateDistance(groupTempTrips[0].departureLocation, groupTempTrips[0].destination)
            : 0
          
          existingProposals.push({
            id: group.id,
            trips: groupTempTrips,
            proposedDepartureTime: group.proposedDepartureTime,
            vehicleType: group.vehicleType,
            estimatedSavings: group.estimatedSavings,
            savingsPercentage: group.estimatedSavings > 0 ? (group.estimatedSavings / 100000) * 100 : 0,
            totalDistance,
            explanation: `Combine ${groupTempTrips.length} trips for cost savings`
          })
        }
      }
      
      setProposals(existingProposals)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load trips data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const runOptimization = async () => {
    setIsOptimizing(true)

    try {
      console.log('🚀 Running AI optimization...')

      // Call backend API to run optimization
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run optimization')
      }

      // Check if no trips available
      if (data.availableTrips === 0) {
        toast({
          title: "No trips to optimize",
          description: data.message || "No approved trips available for optimization",
        })
        setIsOptimizing(false)
        return
      }

      // Get the created proposals
      const newProposals = data.proposals || []
      
      if (!Array.isArray(newProposals)) {
        toast({
          title: "Optimization Error",
          description: "Invalid response from optimization service",
          variant: "destructive"
        })
      } else if (newProposals.length === 0 || data.proposalsCreated === 0) {
        toast({
          title: "No optimization opportunities",
          description: data.message || "No cost-saving combinations found",
        })
      } else {
        // Backend already created optimization groups and temp trips
        // Just reload data to show new proposals
        await loadData()

        const totalSavings = newProposals.reduce((sum: number, p: any) => sum + (p.estimatedSavings || 0), 0)

        toast({
          title: "✅ Optimization Complete",
          description: `Created ${data.proposalsCreated} proposal(s) affecting ${data.tripsAffected} trips. Potential savings: ${formatCurrency(totalSavings)}`,
        })

        console.log(`✅ Optimization successful: ${data.proposalsCreated} proposals created`)
      }
    } catch (error: any) {
      console.error('Optimization error:', error)
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize trips",
        variant: "destructive"
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const approveProposal = async (proposalId: string) => {
    if (!proposalId) {
      toast({
        title: "Error",
        description: "Invalid proposal ID",
        variant: "destructive"
      })
      return
    }

    setApprovingId(proposalId)

    try {
      const proposal = proposals.find(p => p.id === proposalId)
      if (!proposal) {
        throw new Error("Proposal not found")
      }

      // Approve optimization via backend
      await fabricService.approveOptimization(proposalId)

      // Update UI immediately - just remove from proposals list
      setProposals(proposals.filter(p => p.id !== proposalId))

      // Update pending trips count without full reload
      const affectedTripIds = proposal.trips.map(t => t.id)
      setPendingTrips(pendingTrips.filter(t => !affectedTripIds.includes(t.id)))

      toast({
        title: "✅ Proposal Approved",
        description: `Optimized ${proposal.trips.length} trips successfully. Notifications sent to employees.`,
      })

      // Notify parent component of change with small delay to ensure backend updates complete
      setTimeout(() => {
        onOptimizationChange?.()
      }, 500)
    } catch (error: any) {
      console.error('Approval error:', error)
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve proposal",
        variant: "destructive"
      })
    } finally {
      setApprovingId(null)
    }
  }

  const rejectProposal = async (proposalId: string) => {
    if (!proposalId) {
      toast({
        title: "Error",
        description: "Invalid proposal ID",
        variant: "destructive"
      })
      return
    }

    setRejectingId(proposalId)

    try {
      // Reject optimization via backend
      await fabricService.rejectOptimization(proposalId)

      // Update UI immediately - just remove from proposals list
      setProposals(proposals.filter(p => p.id !== proposalId))

      toast({
        title: "❌ Proposal Rejected",
        description: "Optimization rejected. Trips remain as individual requests.",
      })

      // Notify parent component of change
      onOptimizationChange?.()
    } catch (error: any) {
      console.error('Rejection error:', error)
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject proposal",
        variant: "destructive"
      })
    } finally {
      setRejectingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getTimeDifference = (original: string, proposed: string) => {
    if (!original || !proposed) return 'N/A'
    
    const originalParts = original.split(':')
    const proposedParts = proposed.split(':')
    
    if (originalParts.length !== 2 || proposedParts.length !== 2) return 'Invalid time'
    
    const [origHours, origMinutes] = originalParts.map(Number)
    const [propHours, propMinutes] = proposedParts.map(Number)
    
    if (isNaN(origHours) || isNaN(origMinutes) || isNaN(propHours) || isNaN(propMinutes)) {
      return 'Invalid time'
    }
    
    const diff = (propHours * 60 + propMinutes) - (origHours * 60 + origMinutes)
    
    if (diff === 0) return 'No change'
    if (diff > 0) return `+${diff} min`
    return `${diff} min`
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Trip Optimization</CardTitle>
          <CardDescription>
            AI-powered trip combination for cost savings
          </CardDescription>
        </div>
        <Button onClick={runOptimization} disabled={isOptimizing}>
          {isOptimizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Optimization
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <RefreshCw className="mb-2 h-10 w-10 text-gray-400" />
            <h3 className="mb-1 text-lg font-medium">No Proposals</h3>
            <p className="text-sm text-gray-500">
              Run optimization to find cost-saving opportunities
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {pendingTrips.filter(t => !t.optimizedGroupId).length} trips available for optimization
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => {
              if (!proposal || !proposal.trips || !Array.isArray(proposal.trips) || proposal.trips.length === 0) {
                return null
              }
              
              const isApproving = approvingId === proposal.id
              const isRejecting = rejectingId === proposal.id
              
              return (
                <div key={`proposal-${proposal.id}`} className="rounded-lg border p-4 shadow-sm">
                  <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-lg font-medium">
                        Combine {proposal.trips.length} trips
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Date: {proposal.trips[0]?.departureDate ? formatDate(proposal.trips[0].departureDate) : 'N/A'}</span>
                        <Clock className="ml-2 h-4 w-4" />
                        <span>Time: {proposal.proposedDepartureTime || 'N/A'}</span>
                        <Users className="ml-2 h-4 w-4" />
                        <span>{proposal.vehicleType && config.vehicles[proposal.vehicleType as keyof typeof config.vehicles] 
                          ? config.vehicles[proposal.vehicleType as keyof typeof config.vehicles].name 
                          : 'Vehicle'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Save {formatCurrency(proposal.estimatedSavings || 0)} ({Math.round(proposal.savingsPercentage || 0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveProposal(proposal.id)}
                        disabled={isApproving || isRejecting}
                      >
                        {isApproving ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectProposal(proposal.id)}
                        disabled={isApproving || isRejecting}
                      >
                        {isRejecting ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-1 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">Employee</th>
                          <th className="px-4 py-2 text-left font-medium">Route</th>
                          <th className="px-4 py-2 text-left font-medium">Original Time</th>
                          <th className="px-4 py-2 text-left font-medium">Proposed Time</th>
                          <th className="px-4 py-2 text-left font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.trips.map((trip, tripIndex) => (
                          <tr key={`${proposal.id}-trip-${trip.id}-${tripIndex}`} className="border-b">
                            <td className="px-4 py-2">{trip.userName || 'Unknown'}</td>
                            <td className="px-4 py-2">
                              {getLocationName(trip.departureLocation || '')} → {getLocationName(trip.destination || '')}
                            </td>
                            <td className="px-4 py-2">{trip.originalDepartureTime || trip.departureTime || 'N/A'}</td>
                            <td className="px-4 py-2">{proposal.proposedDepartureTime || 'N/A'}</td>
                            <td className="px-4 py-2">
                              <Badge variant={
                                trip.departureTime === proposal.proposedDepartureTime 
                                  ? "secondary" 
                                  : "outline"
                              }>
                                {trip.originalDepartureTime && proposal.proposedDepartureTime 
                                  ? getTimeDifference(trip.originalDepartureTime, proposal.proposedDepartureTime)
                                  : 'N/A'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm">
                      <strong>Optimization Summary:</strong> {proposal.explanation}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}