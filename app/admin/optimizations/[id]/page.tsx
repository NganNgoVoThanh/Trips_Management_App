// app/admin/optimization/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Users, Calendar, MapPin, Car, DollarSign, Clock, Loader2 } from "lucide-react"
import { fabricService, OptimizationGroup, Trip } from "@/lib/fabric-client"
import { authService } from "@/lib/auth-service"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function OptimizationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [optimization, setOptimization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadOptimizationDetail(params.id as string)
    }
  }, [params.id])

  const loadOptimizationDetail = async (groupId: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const groups = await fabricService.getOptimizationGroups()
      const allTrips = await fabricService.getTrips()
      
      const group = groups.find(g => g.id === groupId)
      if (!group) {
        toast({
          title: "Not Found",
          description: "Optimization group not found",
          variant: "destructive"
        })
        router.push('/admin/optimizations')
        return
      }

      const trips = allTrips.filter(t => group.trips.includes(t.id))
      const totalSavings = trips.reduce((sum, t) => {
        if (t.estimatedCost) {
          const actualCost = t.actualCost || (t.estimatedCost * 0.75)
          return sum + (t.estimatedCost - actualCost)
        }
        return sum
      }, 0)
      
      setOptimization({
        ...group,
        tripDetails: trips,
        totalSavings,
        route: trips.length > 0 ? 
          `${getLocationName(trips[0].departureLocation)} → ${getLocationName(trips[0].destination)}` : 
          'N/A'
      })
    } catch (error) {
      console.error('Error loading optimization detail:', error)
      toast({
        title: "Error",
        description: "Failed to load optimization details",
        variant: "destructive"
      })
      router.push('/admin/optimizations')
    } finally {
      setIsLoading(false)
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

  if (!optimization) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AdminHeader />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium">Optimization not found</h3>
              <Button 
                className="mt-4"
                onClick={() => router.push('/admin/optimizations')}
              >
                Back to Optimizations
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/admin/optimizations')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Optimizations
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Optimization Group #{optimization.id.slice(0, 8)}
            </h1>
            <p className="text-gray-500">Detailed view of trip optimization</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Optimization Summary</span>
              <Badge className={
                optimization.status === 'approved' ? 'bg-green-100 text-green-700' :
                optimization.status === 'proposed' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }>
                {optimization.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{optimization.trips.length}</p>
                <p className="text-sm text-gray-500">Trips Combined</p>
              </div>
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(optimization.totalSavings)}
                </p>
                <p className="text-sm text-gray-500">Total Savings</p>
              </div>
              <div className="text-center">
                <Car className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-lg font-semibold">{optimization.vehicleType}</p>
                <p className="text-sm text-gray-500">Vehicle Type</p>
              </div>
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-lg font-semibold">{optimization.proposedDepartureTime}</p>
                <p className="text-sm text-gray-500">Departure Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{optimization.route}</p>
            <p className="text-sm text-gray-500 mt-1">
              Created on {new Date(optimization.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Cost Breakdown & Savings Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Individual Trips Total</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(optimization.tripDetails.reduce((sum: number, t: Trip) => sum + (t.estimatedCost || 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{optimization.tripDetails.length} trips × car-4</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Optimized Group Cost</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(optimization.tripDetails.reduce((sum: number, t: Trip) => sum + (t.estimatedCost || 0), 0) - optimization.totalSavings)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1 trip × {optimization.vehicleType}</p>
                </div>
                <div className="text-center border-l-2 border-green-300">
                  <p className="text-sm text-gray-600 mb-1">Total Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(optimization.totalSavings)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {Math.round((optimization.totalSavings / optimization.tripDetails.reduce((sum: number, t: Trip) => sum + (t.estimatedCost || 0), 0)) * 100)}% saved
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">💡 How Savings Are Calculated</h4>
                <p className="text-sm text-amber-800">
                  By combining {optimization.tripDetails.length} individual trips into one shared {optimization.vehicleType} vehicle,
                  we eliminate duplicate routes and reduce the number of trips from {optimization.tripDetails.length} to 1.
                  This results in significant cost savings while maintaining service quality.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Trip Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {optimization.tripDetails.map((trip: Trip) => (
                <div key={trip.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{trip.userName}</h4>
                      <p className="text-sm text-gray-600">{trip.userEmail}</p>
                      <p className="text-xs font-mono">Trip ID: {trip.id.slice(0, 12)}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Original: {trip.originalDepartureTime || trip.departureTime}</span>
                        <span>→</span>
                        <span className="font-medium">Optimized: {optimization.proposedDepartureTime}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Original Cost (car-4)</p>
                      <p className="font-medium">{formatCurrency(trip.estimatedCost || 0)}</p>
                      <p className="text-xs text-green-600 mt-1">
                        Saved: ~{formatCurrency((trip.estimatedCost || 0) - ((trip.estimatedCost || 0) / optimization.tripDetails.length))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {optimization.approvedAt && (
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-gray-500">
                      {new Date(optimization.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Approved</p>
                    <p className="text-sm text-gray-500">
                      {new Date(optimization.approvedAt).toLocaleString()}
                    </p>
                    {optimization.approvedBy && (
                      <p className="text-sm text-gray-500">
                        By: {optimization.approvedBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}