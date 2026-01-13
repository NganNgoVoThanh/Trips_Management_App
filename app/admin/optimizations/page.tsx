// app/admin/ptimizations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Zap, TrendingDown, Users, Calendar, Loader2, CheckCircle, XCircle } from "lucide-react"
import { fabricService, OptimizationGroup, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"

export default function OptimizationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [optimizations, setOptimizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'loading') {
      loadOptimizations()
    }
  }, [status, session])

  const loadOptimizations = async () => {
    try {
      if (!session?.user || session.user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const groups = await fabricService.getOptimizationGroups()
      const allTrips = await fabricService.getTrips()
      
      // Map groups to detailed optimization data
      const optimizationData = groups.map(group => {
        const trips = allTrips.filter(t => group.trips.includes(t.id))
        const totalSavings = trips.reduce((sum, t) => {
          if (t.estimatedCost) {
            const actualCost = t.actualCost || (t.estimatedCost * 0.75)
            return sum + (t.estimatedCost - actualCost)
          }
          return sum
        }, 0)

        return {
          ...group,
          tripDetails: trips,
          totalSavings,
          route: trips.length > 0 ?
            `${getLocationName(trips[0].departureLocation)} → ${getLocationName(trips[0].destination)}` :
            'N/A',
          date: trips.length > 0 ?
            new Date(trips[0].departureDate).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).split('/').reverse().join('-') // Format: YYYY-MM-DD
            : 'N/A'
        }
      })

      // Filter out optimizations with 0 savings
      const filteredOptimizations = optimizationData.filter(opt => opt.totalSavings > 0)

      // Sort by most recent
      filteredOptimizations.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setOptimizations(filteredOptimizations)
    } catch (error) {
      console.error('Error loading optimizations:', error)
      toast({
        title: "Error",
        description: "Failed to load optimizations",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (groupId: string) => {
    try {
      setProcessingGroupId(groupId)

      const response = await fetch('/api/optimize/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve optimization')
      }

      toast({
        title: "✅ Optimization Approved",
        description: data.message || `Optimization group approved successfully`,
      })

      // Reload optimizations
      await loadOptimizations()
    } catch (error: any) {
      console.error('Error approving optimization:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to approve optimization',
        variant: "destructive"
      })
    } finally {
      setProcessingGroupId(null)
    }
  }

  const handleReject = async (groupId: string) => {
    if (!confirm('Are you sure you want to reject this optimization? This will delete temporary data and preserve original trips.')) {
      return
    }

    try {
      setProcessingGroupId(groupId)

      const response = await fetch('/api/optimize/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject optimization')
      }

      toast({
        title: "❌ Optimization Rejected",
        description: data.message || 'Optimization group rejected successfully',
      })

      // Reload optimizations
      await loadOptimizations()
    } catch (error: any) {
      console.error('Error rejecting optimization:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to reject optimization',
        variant: "destructive"
      })
    } finally {
      setProcessingGroupId(null)
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

      <div className="container mx-auto p-6 pb-8 space-y-4">
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
                <Zap className="h-6 w-6 text-green-600" />
                Optimization History
              </h1>
              <p className="text-gray-500">All trip optimizations and savings</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Savings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(optimizations.reduce((sum, opt) => sum + opt.totalSavings, 0))}
            </p>
          </div>
        </div>

        {optimizations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-medium">No optimizations yet</h3>
              <p className="text-gray-500">Run optimization to combine trips and save costs</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {optimizations.map((opt) => (
              <Card key={opt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg">Optimization Group #{opt.id.slice(0, 8)}</h3>
                        <Badge className={
                          opt.status === 'approved' ? 'bg-green-100 text-green-700' :
                          opt.status === 'proposed' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {opt.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{opt.trips.length} trips combined</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{opt.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Saved {formatCurrency(opt.totalSavings)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-gray-400" />
                          <span>{opt.vehicleType}</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Route:</strong> {opt.route}</p>
                        <p><strong>Departure Time:</strong> {
                          opt.proposedDepartureTime.includes('T')
                            ? new Date(`1970-01-01T${opt.proposedDepartureTime.split('T')[1]}`).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })
                            : opt.proposedDepartureTime
                        }</p>
                      </div>

                      {/* Cost Breakdown Summary */}
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600">Original Cost:</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(opt.tripDetails.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0))}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Optimized Cost:</p>
                            <p className="font-semibold text-blue-700">
                              {formatCurrency(opt.tripDetails.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0) - opt.totalSavings)}
                            </p>
                          </div>
                          <div className="border-l pl-2 border-green-300">
                            <p className="text-gray-600">Savings:</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(opt.totalSavings)} ({Math.round((opt.totalSavings / opt.tripDetails.reduce((sum: number, t: any) => sum + (t.estimatedCost || 0), 0)) * 100)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {opt.tripDetails && opt.tripDetails.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Employees:</p>
                          <div className="flex flex-wrap gap-2">
                            {opt.tripDetails.map((trip: Trip) => (
                              <Badge key={trip.id} variant="outline" className="text-xs">
                                {trip.userName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Only show for proposed status */}
                    {opt.status === 'proposed' && (
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleApprove(opt.id)}
                          disabled={processingGroupId === opt.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          {processingGroupId === opt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(opt.id)}
                          disabled={processingGroupId === opt.id}
                          variant="destructive"
                          size="sm"
                        >
                          {processingGroupId === opt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
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
