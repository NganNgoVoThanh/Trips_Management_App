"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Filter, Search, Activity, Download, ChevronLeft } from "lucide-react"
import { fabricService, Trip } from "@/lib/supabase-service"
import { authService } from "@/lib/auth-service"
import { getLocationName } from "@/lib/config"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ActivityPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [filteredActivities, setFilteredActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    loadActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchTerm, statusFilter, dateFilter])

  const loadActivities = async () => {
    try {
      setIsLoading(true)
      const user = authService.getCurrentUser()
      if (!user) {
        router.push('/')
        return
      }

      const trips = await fabricService.getTrips({ userId: user.id })
      
      // Convert trips to activities with more details
      const activityList = trips.map(trip => ({
        id: trip.id,
        type: getActivityType(trip.status),
        title: `${getLocationName(trip.departureLocation)} → ${getLocationName(trip.destination)}`,
        description: getActivityDescription(trip),
        date: trip.departureDate,
        time: trip.departureTime,
        status: trip.status,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        icon: getActivityIcon(trip.status),
        color: getActivityColor(trip.status)
      }))

      // Sort by most recent first
      activityList.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - 
        new Date(a.updatedAt || a.createdAt).getTime()
      )

      setActivities(activityList)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActivityType = (status: string) => {
    switch(status) {
      case 'optimized': return 'Trip Optimized'
      case 'confirmed': return 'Trip Confirmed'
      case 'cancelled': return 'Trip Cancelled'
      case 'pending': return 'Trip Registered'
      default: return 'Trip Activity'
    }
  }

  const getActivityDescription = (trip: Trip) => {
    switch(trip.status) {
      case 'optimized': 
        return `Your trip has been optimized and combined with other employees for cost savings`
      case 'confirmed': 
        return `Your trip has been confirmed and approved`
      case 'cancelled': 
        return `This trip has been cancelled`
      case 'pending': 
        return `Trip registered and awaiting approval`
      default: 
        return `Trip status updated`
    }
  }

  const getActivityIcon = (status: string) => {
    switch(status) {
      case 'optimized': return '✨'
      case 'confirmed': return '✅'
      case 'cancelled': return '❌'
      case 'pending': return '⏳'
      default: return '📍'
    }
  }

  const getActivityColor = (status: string) => {
    switch(status) {
      case 'optimized': return 'text-green-600 bg-green-50'
      case 'confirmed': return 'text-blue-600 bg-blue-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter)
    }

    if (dateFilter) {
      filtered = filtered.filter(activity => activity.date === dateFilter)
    }

    setFilteredActivities(filtered)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportActivities = () => {
    // Create CSV content
    const csv = [
      ['Date', 'Type', 'Route', 'Status', 'Description'],
      ...filteredActivities.map(a => [
        a.date,
        a.type,
        a.title,
        a.status,
        a.description
      ])
    ].map(row => row.join(',')).join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-red-600" />
                Activity History
              </h1>
              <p className="text-gray-500">View all your trip activities and updates</p>
            </div>
          </div>
          <Button onClick={exportActivities} variant="outline">
            <Download className="mr-2 h-4 w-4  text-red-600" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="optimized">Optimized</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-full md:w-[180px]"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              {(searchTerm || statusFilter !== 'all' || dateFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setDateFilter("")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle>Activities</CardTitle>
            <CardDescription>
              {filteredActivities.length} activities found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className={`text-2xl p-2 rounded-lg ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{activity.type}</h3>
                      <Badge variant="outline" className={
                        activity.status === 'optimized' ? 'border-blue-400 text-blue-700' :
                        activity.status === 'confirmed' ? 'border-green-400 text-green-700' :
                        activity.status === 'cancelled' ? 'border-red-400 text-red-700' :
                        'border-yellow-400 text-yellow-700'
                      }>
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{activity.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(activity.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </span>
                      <span>
                        Updated: {formatTime(activity.updatedAt || activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredActivities.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No activities found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
