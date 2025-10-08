// app/admin/ptimizations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Zap, TrendingDown, Users, Calendar, Loader2 } from "lucide-react"
import { fabricService, OptimizationGroup, Trip } from "@/lib/mysql-service"
import { authService } from "@/lib/auth-service"
import { formatCurrency, getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function OptimizationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [optimizations, setOptimizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOptimizations()
  }, [])

  const loadOptimizations = async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
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
          date: trips.length > 0 ? trips[0].departureDate : 'N/A'
        }
      })
      
      // Sort by most recent
      optimizationData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setOptimizations(optimizationData)
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
                      
                      <div className="text-sm text-gray-600">
                        <p>Route: {opt.route}</p>
                        <p>Departure Time: {opt.proposedDepartureTime}</p>
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
