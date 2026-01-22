// app/admin/statistics/vehicle-utilization/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Car, TrendingUp, Users, Gauge, Download, Loader2 } from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { useSession } from "next-auth/react"
import { formatCurrency, getLocationName, getVehiclePassengerCapacity } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface VehicleStats {
  type: string
  capacity: number
  tripsCount: number
  totalPassengers: number
  utilizationRate: number
  avgPassengersPerTrip: number
  totalCost: number
  costPerPassenger: number
}

export default function VehicleUtilizationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [vehicleStats, setVehicleStats] = useState<VehicleStats[]>([])
  const [overallStats, setOverallStats] = useState({
    totalUtilization: 0,
    totalTrips: 0,
    totalCapacity: 0,
    actualPassengers: 0,
    potentialSavings: 0,
    recommendedOptimizations: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    // Only run when status is not loading
    if (status !== 'loading') {
      loadVehicleData()
    }
  }, [status, timeRange]) // Removed session from deps to prevent re-render loops

  const loadVehicleData = async () => {
    try {
      // Wait for session to finish loading
      if (status === 'loading') {
        return
      }

      // Only redirect if authenticated but NOT admin (user shouldn't be here)
      if (status === 'authenticated' && session?.user && session.user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // If unauthenticated, let Next.js handle redirect via middleware
      if (status === 'unauthenticated') {
        return
      }

      setIsLoading(true)

      const allTrips = await fabricService.getTrips()
      
      // Filter by time range
      const now = new Date()
      const filteredTrips = allTrips.filter(trip => {
        const tripDate = new Date(trip.departureDate)
        if (timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return tripDate >= weekAgo
        } else if (timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return tripDate >= monthAgo
        } else if (timeRange === 'year') {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          return tripDate >= yearAgo
        }
        return true
      }).filter(t => t.status !== 'cancelled')

      // Vehicle type configurations - FIXED: Use passenger capacity (excluding driver)
      const vehicleConfigs = {
        'car-4': { name: '4-Seater Car', totalSeats: 4, passengerCapacity: 3, icon: '🚗' },
        'car-7': { name: '7-Seater Car', totalSeats: 7, passengerCapacity: 6, icon: '🚙' },
        'van-16': { name: '16-Seater Van', totalSeats: 16, passengerCapacity: 15, icon: '🚐' }
      }

      // Calculate stats for each vehicle type
      const stats: VehicleStats[] = []
      let totalCapacityUsed = 0
      let totalCapacityAvailable = 0
      let totalPassengersTransported = 0

      for (const [type, config] of Object.entries(vehicleConfigs)) {
        const vehicleTrips = filteredTrips.filter(t => t.vehicleType === type)

        if (vehicleTrips.length > 0) {
          // FIXED: Count actual passengers from num_passengers field
          // Sum up num_passengers from all trips (default to 1 if not specified)
          const totalPassengers = vehicleTrips.reduce((sum, trip) => {
            return sum + (trip.numPassengers || trip.num_passengers || 1)
          }, 0)

          // FIXED: Use passenger capacity (excluding driver seat)
          const totalCapacity = vehicleTrips.length * config.passengerCapacity
          const utilizationRate = totalCapacity > 0 ? (totalPassengers / totalCapacity) * 100 : 0
          const totalCost = vehicleTrips.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost || 0), 0)

          stats.push({
            type: config.name,
            capacity: config.passengerCapacity, // FIXED: Use passenger capacity
            tripsCount: vehicleTrips.length,
            totalPassengers,
            utilizationRate,
            avgPassengersPerTrip: vehicleTrips.length > 0 ? totalPassengers / vehicleTrips.length : 0,
            totalCost,
            costPerPassenger: totalPassengers > 0 ? totalCost / totalPassengers : 0
          })

          totalCapacityUsed += totalPassengers
          totalCapacityAvailable += totalCapacity
          totalPassengersTransported += totalPassengers
        }
      }

      // Calculate overall utilization
      const overallUtilization = totalCapacityAvailable > 0 
        ? (totalCapacityUsed / totalCapacityAvailable) * 100 
        : 0

      // Calculate potential savings (if we could achieve 80% utilization)
      const targetUtilization = 80
      const currentCost = filteredTrips.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost || 0), 0)
      const potentialTripsNeeded = Math.ceil(totalPassengersTransported / (targetUtilization / 100 * 7)) // Assuming 7-seater average
      const potentialCost = (potentialTripsNeeded / filteredTrips.length) * currentCost
      const potentialSavings = currentCost - potentialCost

      // Identify optimization opportunities
      const underutilizedTrips = filteredTrips.filter(trip => {
        if (trip.vehicleType === 'van-16' && !trip.optimizedGroupId) return true
        if (trip.vehicleType === 'car-7' && !trip.optimizedGroupId) return true
        return false
      })

      setOverallStats({
        totalUtilization: overallUtilization,
        totalTrips: filteredTrips.length,
        totalCapacity: totalCapacityAvailable,
        actualPassengers: totalPassengersTransported,
        potentialSavings: potentialSavings > 0 ? potentialSavings : 0,
        recommendedOptimizations: underutilizedTrips.length
      })

      setVehicleStats(stats)
    } catch (error) {
      console.error('Error loading vehicle data:', error)
      toast({
        title: "Error",
        description: "Failed to load vehicle utilization data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const csv = [
      ['Vehicle Utilization Report - ' + new Date().toLocaleDateString()],
      ['Time Range: ' + timeRange],
      [],
      ['Overall Statistics'],
      ['Total Utilization', overallStats.totalUtilization.toFixed(2) + '%'],
      ['Total Trips', overallStats.totalTrips],
      ['Total Capacity', overallStats.totalCapacity],
      ['Actual Passengers', overallStats.actualPassengers],
      ['Potential Savings', formatCurrency(overallStats.potentialSavings)],
      ['Optimization Opportunities', overallStats.recommendedOptimizations],
      [],
      ['Vehicle Type Statistics'],
      ['Type', 'Capacity', 'Trips', 'Passengers', 'Utilization %', 'Avg Passengers/Trip', 'Total Cost', 'Cost/Passenger'],
      ...vehicleStats.map(v => [
        v.type,
        v.capacity,
        v.tripsCount,
        v.totalPassengers,
        v.utilizationRate.toFixed(2),
        v.avgPassengersPerTrip.toFixed(1),
        v.totalCost,
        v.costPerPassenger.toFixed(0)
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vehicle-utilization-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    if (rate >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getUtilizationBadge = (rate: number) => {
    if (rate >= 80) return { variant: 'default' as const, text: 'Excellent' }
    if (rate >= 60) return { variant: 'secondary' as const, text: 'Good' }
    if (rate >= 40) return { variant: 'outline' as const, text: 'Fair' }
    return { variant: 'destructive' as const, text: 'Poor' }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
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
                <Car className="h-6 w-6 text-teal-600" />
                Vehicle Utilization Analysis
              </h1>
              <p className="text-gray-500">Monitor and optimize vehicle capacity usage</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 border rounded-md"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <Button onClick={exportData} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Overall Utilization Card */}
        <Card className="border-l-4 border-l-teal-600">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Overall Vehicle Utilization
              </span>
              <Badge {...getUtilizationBadge(overallStats.totalUtilization)}>
                {getUtilizationBadge(overallStats.totalUtilization).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Capacity Utilization</span>
                  <span className={`text-2xl font-bold ${getUtilizationColor(overallStats.totalUtilization)}`}>
                    {overallStats.totalUtilization.toFixed(1)}%
                  </span>
                </div>
                <Progress value={overallStats.totalUtilization} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div>
                  <p className="text-sm text-gray-500">Total Trips</p>
                  <p className="text-xl font-bold">{overallStats.totalTrips}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Capacity</p>
                  <p className="text-xl font-bold">{overallStats.totalCapacity} seats</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Passengers Transported</p>
                  <p className="text-xl font-bold">{overallStats.actualPassengers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Potential Savings</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(overallStats.potentialSavings)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Alert */}
        {overallStats.recommendedOptimizations > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-900">Optimization Opportunities</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {overallStats.recommendedOptimizations} trips could be optimized for better vehicle utilization.
                    Consider combining these trips to achieve up to 80% capacity utilization and save {formatCurrency(overallStats.potentialSavings)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Type Performance</CardTitle>
            <CardDescription>Utilization metrics by vehicle type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {vehicleStats.map((vehicle) => (
                <div key={vehicle.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {vehicle.type.includes('4') ? '🚗' : 
                         vehicle.type.includes('7') ? '🚙' : '🚐'}
                      </div>
                      <div>
                        <h3 className="font-medium">{vehicle.type}</h3>
                        <p className="text-sm text-gray-500">Capacity: {vehicle.capacity} passengers</p>
                      </div>
                    </div>
                    <Badge className={getUtilizationColor(vehicle.utilizationRate)}>
                      {vehicle.utilizationRate.toFixed(1)}% utilized
                    </Badge>
                  </div>
                  
                  <Progress value={vehicle.utilizationRate} className="h-2 mb-4" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Trips</p>
                      <p className="font-semibold">{vehicle.tripsCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Passengers</p>
                      <p className="font-semibold">{vehicle.totalPassengers}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg/Trip</p>
                      <p className="font-semibold">{vehicle.avgPassengersPerTrip.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cost/Passenger</p>
                      <p className="font-semibold">{formatCurrency(vehicle.costPerPassenger)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {vehicleStats.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No vehicle data available for the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}