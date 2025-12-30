"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Mail,
  Calendar,
  Shield,
  Car,
  TrendingDown,
  Clock,
  Save,
  Edit,
  LogOut,
  Award,
  Target,
  Loader2,
  CheckCircle,
  Users,
  Download
} from "lucide-react"
import { fabricService, Trip } from "@/lib/fabric-client"
import { formatCurrency, getLocationName } from "@/lib/config"
import { exportToCsv } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { AdminHeader } from "@/components/admin/header"
import { DashboardHeader } from "@/components/dashboard/header"
import { joinRequestService, JoinRequest } from "@/lib/join-request-client"
import { AlertCircle, MessageSquare, CheckCircle2, XCircle } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalSavings: 0,
    totalDistance: 0,
    favoriteRoute: '',
    optimizationRate: 0,
    carbonSaved: 0
  })
  
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    shareStatistics: true,
    locationTracking: false
  })
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    employeeId: '',
    preferredVehicle: 'car-4',
    preferredDepartureTime: '08:00',
    emergencyContact: '',
    emergencyPhone: ''
  })

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      loadProfileData()
    } else if (status === "unauthenticated") {
      router.push('/')
    }
  }, [status, session])

  const loadProfileData = async () => {
    try {
      setIsLoading(true)

      // ✅ Use NextAuth session
      const currentUser = session?.user
      if (!currentUser || !currentUser.email) {
        router.push('/')
        return
      }

      setUser(currentUser)
      setIsAdmin(currentUser.role === 'admin')

      // Load profile data from MySQL
      try {
        const userResponse = await fetch(`/api/users/${currentUser.id}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setProfileData({
            name: userData.name || currentUser.name,
            email: userData.email || currentUser.email,
            phone: userData.phone || currentUser.phone || '',
            department: userData.department || currentUser.department || 'General',
            employeeId: userData.employee_id || currentUser.employeeId || '',
            preferredVehicle: userData.preferred_vehicle || 'car-4',
            preferredDepartureTime: userData.preferred_departure_time || '08:00',
            emergencyContact: userData.emergency_contact || '',
            emergencyPhone: userData.emergency_phone || ''
          })

          setPrivacySettings({
            profileVisibility: userData.profile_visibility ?? true,
            shareStatistics: userData.share_statistics ?? true,
            locationTracking: userData.location_tracking ?? false
          })
        } else {
          // Fallback to session data if API fails
          setProfileData({
            name: currentUser.name || 'User',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            department: currentUser.department || 'General',
            employeeId: currentUser.employeeId || '',
            preferredVehicle: 'car-4',
            preferredDepartureTime: '08:00',
            emergencyContact: '',
            emergencyPhone: ''
          })
        }
      } catch (error) {
        console.error('Error loading profile from API:', error)
        // Fallback to session data
        setProfileData({
          name: currentUser.name || 'User',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          department: currentUser.department || 'General',
          employeeId: currentUser.employeeId || '',
          preferredVehicle: 'car-4',
          preferredDepartureTime: '08:00',
          emergencyContact: '',
          emergencyPhone: ''
        })
      }
      
      const userTrips = await fabricService.getTrips({ userId: currentUser.id })
      setTrips(userTrips)
      calculateStats(userTrips)

      // Load join requests
      const requests = await joinRequestService.getJoinRequests({ requesterId: currentUser.id })
      setJoinRequests(requests)
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (trips: Trip[]) => {
    const totalTrips = trips.length
    const optimizedTrips = trips.filter(t => t.status === 'optimized').length
    const totalSavings = trips.reduce((sum, t) => {
      if (t.status === 'optimized' && t.estimatedCost) {
        const actualCost = t.actualCost || (t.estimatedCost * 0.75)
        return sum + (t.estimatedCost - actualCost)
      }
      return sum
    }, 0)
    
    // Calculate favorite route
    const routeCounts = new Map<string, number>()
    trips.forEach(t => {
      const route = `${t.departureLocation}-${t.destination}`
      routeCounts.set(route, (routeCounts.get(route) || 0) + 1)
    })
    let favoriteRoute = ''
    let maxCount = 0
    routeCounts.forEach((count, route) => {
      if (count > maxCount) {
        maxCount = count
        favoriteRoute = route
      }
    })
    
    const optimizationRate = totalTrips > 0 ? (optimizedTrips / totalTrips) * 100 : 0
    const carbonSaved = totalSavings / 10000 * 2.3 // Estimate CO2 savings
    
    setStats({
      totalTrips,
      totalSavings,
      totalDistance: trips.length * 100, // Estimate average 100km per trip
      favoriteRoute,
      optimizationRate,
      carbonSaved
    })
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const userId = user.id

      // Save to MySQL via API
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: profileData.phone,
          emergency_contact: profileData.emergencyContact,
          emergency_phone: profileData.emergencyPhone,
          preferred_vehicle: profileData.preferredVehicle,
          preferred_departure_time: profileData.preferredDepartureTime
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      toast({
        title: "Profile Updated",
        description: "Your settings have been saved successfully",
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save profile changes",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)
    try {
      const userId = user.id

      // Save to MySQL via API
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferred_vehicle: profileData.preferredVehicle,
          preferred_departure_time: profileData.preferredDepartureTime
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      toast({
        title: "Preferences Saved",
        description: "Your trip preferences have been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save preferences",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportHistory = () => {
    const csvData = [
      ['Date', 'Route', 'Time', 'Status', 'Cost', 'Savings'],
      ...trips.map(t => [
        t.departureDate,
        `${getLocationName(t.departureLocation)} to ${getLocationName(t.destination)}`,
        t.departureTime,
        t.status,
        t.estimatedCost || '',
        t.status === 'optimized' && t.actualCost ? ((t.estimatedCost || 0) - t.actualCost) : ''
      ])
    ]

    exportToCsv(csvData, `trip-history-${new Date().toISOString().split('T')[0]}.csv`)

    toast({
      title: "Export Successful",
      description: "Your trip history has been exported",
    })
  }

  const handleSavePrivacySettings = async () => {
    try {
      const userId = user.id

      // Save to MySQL via API
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_visibility: privacySettings.profileVisibility,
          share_statistics: privacySettings.shareStatistics,
          location_tracking: privacySettings.locationTracking
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update privacy settings')
      }

      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save privacy settings",
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    // Logout is handled by header component using NextAuth signOut
    // This is just a fallback
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // ✅ Show loading while checking authentication
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex min-h-screen flex-col">
        {isAdmin ? <AdminHeader /> : <DashboardHeader />}
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  // ✅ Redirect if not authenticated
  if (status === "unauthenticated" || !session?.user) {
    router.push('/')
    return null
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {isAdmin ? <AdminHeader /> : <DashboardHeader />}
      <div className="container mx-auto p-6 space-y-4 max-w-7xl flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white">
                {/* ✅ Priority: Azure AD avatar > UI Avatars > Initials fallback */}
                <AvatarImage
                  src={user?.image || `https://ui-avatars.com/api/?name=${user?.name}&background=fff&color=dc2626`}
                  alt={user?.name || 'User'}
                />
                <AvatarFallback className="bg-white text-red-600 text-xl">
                  {getInitials(user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <p className="text-red-100">
                  {user?.jobTitle && <span>{user.jobTitle} • </span>}
                  {user?.department}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white text-red-600">
                    {user?.role === 'admin' ? 'Administrator' : 'Employee'}
                  </Badge>
                  <Badge variant="outline" className="border-white text-white">
                    ID: {user?.employeeId}
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white text-red-600 hover:bg-gray-100"
            >
              <Edit className="mr-2 h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-t-4 border-t-red-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalTrips}</p>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-green-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Money Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSavings)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-blue-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Optimization Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.optimizationRate.toFixed(0)}%</p>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-purple-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Distance Traveled</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalDistance} km</p>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-orange-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Favorite Route</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {stats.favoriteRoute ? 
                  stats.favoriteRoute.split('-').map(l => getLocationName(l)).join(' → ') : 
                  'No trips yet'
                }
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-teal-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">CO₂ Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-teal-600">
                {stats.carbonSaved.toFixed(1)} kg
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs content continues as in original file... */}
        <Tabs defaultValue="personal" className="space-y-4">
          {/* All tab content from original file */}
          <TabsList className="bg-red-50 border border-red-200">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="history">Trip History</TabsTrigger>
            <TabsTrigger value="requests">Join Requests</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="+84 xxx xxx xxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={profileData.department}
                      onValueChange={(value) => setProfileData({...profileData, department: value})}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="department">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="HR">Human Resources</SelectItem>
                        <SelectItem value="IT">Information Technology</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Process RD & Optimization">Process RD & Optimization</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={profileData.employeeId}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={profileData.emergencyContact}
                      onChange={(e) => setProfileData({...profileData, emergencyContact: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={profileData.emergencyPhone}
                      onChange={(e) => setProfileData({...profileData, emergencyPhone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Contact phone"
                    />
                  </div>
                </div>
                {isEditing && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProfile}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trip Preferences</CardTitle>
                <CardDescription>Set your default trip preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Vehicle Type</Label>
                    <Select 
                      value={profileData.preferredVehicle}
                      onValueChange={(value) => setProfileData({...profileData, preferredVehicle: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="car-4">4-Seater Car</SelectItem>
                        <SelectItem value="car-7">7-Seater Car</SelectItem>
                        <SelectItem value="van-16">16-Seater Van</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Departure Time</Label>
                    <Input
                      type="time"
                      value={profileData.preferredDepartureTime}
                      onChange={(e) => setProfileData({...profileData, preferredDepartureTime: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Automatic notifications for trip updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Automatic Notifications</AlertTitle>
                  <AlertDescription>
                    You will automatically receive email notifications for trip confirmations, status changes, and optimizations at <strong>{user?.email}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Trip confirmation emails</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Optimization alerts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Status change notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Cancellation notices</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trip History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trip History</CardTitle>
                <CardDescription>Your complete business trip history</CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No trip history yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your completed trips will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trips.map((trip) => (
                      <div key={trip.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${
                            trip.status === 'optimized' ? 'bg-green-500' :
                            trip.status === 'confirmed' ? 'bg-blue-500' :
                            trip.status === 'cancelled' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium">
                              {getLocationName(trip.departureLocation)} → {getLocationName(trip.destination)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(trip.departureDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {trip.departureTime}
                              </span>
                              {trip.vehicleType && (
                                <span className="flex items-center gap-1">
                                  <Car className="h-3 w-3" />
                                  {trip.vehicleType === 'car-4' ? '4-Seater' : 
                                   trip.vehicleType === 'car-7' ? '7-Seater' : '16-Seater'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={
                            trip.status === 'optimized' ? 'bg-green-50 text-green-700 border-green-200' :
                            trip.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            trip.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }>
                            {trip.status}
                          </Badge>
                          {trip.estimatedCost && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatCurrency(trip.estimatedCost)}
                            </p>
                          )}
                          {trip.status === 'optimized' && trip.actualCost && (
                            <p className="text-xs text-green-600 mt-1">
                              Saved: {formatCurrency((trip.estimatedCost || 0) - trip.actualCost)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {trips.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        Showing {trips.length} trips
                      </p>
                      <Button variant="outline" size="sm" onClick={handleExportHistory}>
                        <Download className="mr-2 h-4 w-4" />
                        Export History
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Join Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Join Requests History</CardTitle>
                <CardDescription>View all your requests to join existing trips</CardDescription>
              </CardHeader>
              <CardContent>
                {joinRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No join requests yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your join requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">
                                {getLocationName(request.tripDetails.departureLocation)} → {getLocationName(request.tripDetails.destination)}
                              </h3>
                              <Badge
                                variant={
                                  request.status === 'approved' ? 'default' :
                                  request.status === 'pending' ? 'outline' :
                                  request.status === 'rejected' ? 'destructive' :
                                  'secondary'
                                }
                                className={
                                  request.status === 'approved' ? 'bg-green-600' :
                                  request.status === 'rejected' ? 'bg-red-600' :
                                  request.status === 'cancelled' ? 'bg-gray-500' :
                                  ''
                                }
                              >
                                {request.status === 'approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {request.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                                {request.status}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(request.tripDetails.departureDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {request.tripDetails.departureTime}
                              </span>
                            </div>

                            {request.reason && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                <p className="text-gray-600 font-medium mb-1">Your reason:</p>
                                <p className="text-gray-700">{request.reason}</p>
                              </div>
                            )}

                            {request.adminNotes && (
                              <div className={`mt-2 p-3 rounded border ${
                                request.status === 'approved'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <p className={`text-sm font-medium mb-1 ${
                                  request.status === 'approved' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  Admin Note:
                                </p>
                                <p className={`text-sm ${
                                  request.status === 'approved' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {request.adminNotes}
                                </p>
                              </div>
                            )}

                            <div className="text-xs text-gray-400 mt-2">
                              Requested: {new Date(request.createdAt).toLocaleString()}
                              {request.processedAt && (
                                <span> • Processed: {new Date(request.processedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>Milestones and rewards earned through your travels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <Award className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <h3 className="font-medium">Early Bird</h3>
                    <p className="text-sm text-gray-500">Complete 10 trips before 8 AM</p>
                    <Progress value={trips.filter(t => parseInt(t.departureTime) < 8).length * 10} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {trips.filter(t => parseInt(t.departureTime) < 8).length}/10
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <TrendingDown className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h3 className="font-medium">Cost Saver</h3>
                    <p className="text-sm text-gray-500">Save over 1,000,000 VND</p>
                    <Progress value={Math.min((stats.totalSavings / 1000000) * 100, 100)} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {formatCurrency(stats.totalSavings)} / 1,000,000 VND
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <Users className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-medium">Team Player</h3>
                    <p className="text-sm text-gray-500">Join 5 combined trips</p>
                    <Progress value={trips.filter(t => t.status === 'optimized').length * 20} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {trips.filter(t => t.status === 'optimized').length}/5
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <Car className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-medium">Frequent Traveler</h3>
                    <p className="text-sm text-gray-500">Complete 50 trips</p>
                    <Progress value={(trips.length / 50) * 100} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {trips.length}/50
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <Target className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <h3 className="font-medium">Perfect Planner</h3>
                    <p className="text-sm text-gray-500">Zero cancellations</p>
                    <Progress value={trips.filter(t => t.status !== 'cancelled').length === trips.length ? 100 : 0} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {trips.filter(t => t.status === 'cancelled').length === 0 ? '✓ Achieved' : `${trips.filter(t => t.status === 'cancelled').length} cancellations`}
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow opacity-50">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <h3 className="font-medium">Elite Traveler</h3>
                    <p className="text-sm text-gray-500">Complete 100 trips</p>
                    <Progress value={(trips.length / 100) * 100} className="mt-2 h-2" />
                    <p className="text-xs text-gray-400 mt-1">
                      {trips.length}/100
                    </p>
                  </div>
                </div>
                
                {/* Achievement Stats */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-4">Your Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-red-600">{trips.length}</p>
                      <p className="text-sm text-gray-500">Total Trips</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSavings)}</p>
                      <p className="text-sm text-gray-500">Money Saved</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalDistance} km</p>
                      <p className="text-sm text-gray-500">Distance Traveled</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-teal-600">{stats.carbonSaved.toFixed(1)} kg</p>
                      <p className="text-sm text-gray-500">CO₂ Saved</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security & Account</CardTitle>
                <CardDescription>Manage your account security via SSO and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>SSO Authentication</AlertTitle>
                  <AlertDescription>
                    Your account is secured via Single Sign-On (SSO). Authentication and password management are handled by your organization's identity provider.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Email Verified</p>
                        <p className="text-sm text-green-700 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Verified via SSO
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Sign Out</p>
                        <p className="text-sm text-red-600">Sign out from this device</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-100"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
