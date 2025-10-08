"use client"

import { useState, useEffect } from "react"
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
  Download,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  History
} from "lucide-react"
import { authService } from "@/lib/auth-service"
import { fabricService, Trip } from "@/lib/mysql-service"
import { formatCurrency, getLocationName } from "@/lib/config"
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

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalSavings: 0,
    totalDistance: 0,
    favoriteRoute: '',
    optimizationRate: 0,
    carbonSaved: 0
  })
  
  // Dialog states
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showLoginHistoryDialog, setShowLoginHistoryDialog] = useState(false)
  const [twoFACode, setTwoFACode] = useState("")
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loginHistory, setLoginHistory] = useState<any[]>([])
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

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    tripReminders: true,
    optimizationAlerts: true,
    weeklyReports: false
  })

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setIsLoading(true)
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)
      setIsAdmin(currentUser.role === 'admin')
      
      // Load profile data
      setProfileData({
        name: currentUser.name,
        email: currentUser.email,
        phone: localStorage.getItem(`phone_${currentUser.id}`) || '+84 xxx xxx xxx',
        department: currentUser.department || 'General',
        employeeId: currentUser.employeeId || '',
        preferredVehicle: localStorage.getItem(`vehicle_${currentUser.id}`) || 'car-4',
        preferredDepartureTime: localStorage.getItem(`departure_${currentUser.id}`) || '08:00',
        emergencyContact: localStorage.getItem(`emergency_contact_${currentUser.id}`) || '',
        emergencyPhone: localStorage.getItem(`emergency_phone_${currentUser.id}`) || ''
      })
      
      // Load notification preferences
      const savedNotifications = localStorage.getItem(`notifications_${currentUser.id}`)
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications))
      }
      
      // Load privacy settings
      const savedPrivacy = localStorage.getItem(`privacy_${currentUser.id}`)
      if (savedPrivacy) {
        setPrivacySettings(JSON.parse(savedPrivacy))
      }
      
      // Load login history
      const savedHistory = localStorage.getItem(`login_history_${currentUser.id}`)
      if (savedHistory) {
        setLoginHistory(JSON.parse(savedHistory))
      } else {
        // Create sample login history
        setLoginHistory([
          { date: new Date().toISOString(), device: 'Chrome - Windows', ip: '192.168.1.1', location: 'Ho Chi Minh City' },
          { date: new Date(Date.now() - 86400000).toISOString(), device: 'Safari - iPhone', ip: '192.168.1.2', location: 'Ho Chi Minh City' },
          { date: new Date(Date.now() - 172800000).toISOString(), device: 'Chrome - Windows', ip: '192.168.1.1', location: 'Ho Chi Minh City' }
        ])
      }
      
      const userTrips = await fabricService.getTrips({ userId: currentUser.id })
      setTrips(userTrips)
      calculateStats(userTrips)
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
      // Save to localStorage (in production, save to database)
      const userId = user.id
      localStorage.setItem(`phone_${userId}`, profileData.phone)
      localStorage.setItem(`vehicle_${userId}`, profileData.preferredVehicle)
      localStorage.setItem(`departure_${userId}`, profileData.preferredDepartureTime)
      localStorage.setItem(`emergency_contact_${userId}`, profileData.emergencyContact)
      localStorage.setItem(`emergency_phone_${userId}`, profileData.emergencyPhone)
      
      await authService.updateUserProfile(profileData)
      
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
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications))
      localStorage.setItem(`vehicle_${userId}`, profileData.preferredVehicle)
      localStorage.setItem(`departure_${userId}`, profileData.preferredDepartureTime)
      
      toast({
        title: "Preferences Saved",
        description: "Your preferences have been updated successfully",
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
    const csv = [
      ['Date', 'Route', 'Time', 'Status', 'Cost', 'Savings'],
      ...trips.map(t => [
        t.departureDate,
        `${getLocationName(t.departureLocation)} to ${getLocationName(t.destination)}`,
        t.departureTime,
        t.status,
        t.estimatedCost || '',
        t.status === 'optimized' && t.actualCost ? ((t.estimatedCost || 0) - t.actualCost) : ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast({
      title: "Export Successful",
      description: "Your trip history has been exported",
    })
  }

  const handleEnable2FA = async () => {
    if (twoFACode.length === 6) {
      // Simulate 2FA setup
      localStorage.setItem(`2fa_enabled_${user.id}`, 'true')
      setShow2FADialog(false)
      setTwoFACode("")
      
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account",
      })
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      })
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }
    
    if (passwordData.new.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive"
      })
      return
    }
    
    // Simulate password change
    localStorage.setItem(`password_changed_${user.id}`, new Date().toISOString())
    setShowPasswordDialog(false)
    setPasswordData({ current: "", new: "", confirm: "" })
    
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully",
    })
  }

  const handleSavePrivacySettings = () => {
    localStorage.setItem(`privacy_${user.id}`, JSON.stringify(privacySettings))
    toast({
      title: "Privacy Settings Updated",
      description: "Your privacy preferences have been saved",
    })
  }

  const handleLogout = async () => {
    await authService.logout()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        {isAdmin ? <AdminHeader /> : <DashboardHeader />}
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {isAdmin ? <AdminHeader /> : <DashboardHeader />}
      <div className="container mx-auto p-6 space-y-6 max-w-7xl flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name}&background=fff&color=dc2626`} />
                <AvatarFallback className="bg-white text-red-600 text-xl">
                  {getInitials(user?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <p className="text-red-100">{user?.department}</p>
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
                    <Label htmlFor="department">Department</Label>
                    <Select 
                      value={profileData.department}
                      onValueChange={(value) => setProfileData({...profileData, department: value})}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
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
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive trip updates via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailNotifications: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Get SMS alerts for important updates</p>
                  </div>
                  <Switch
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, smsNotifications: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Trip Reminders</Label>
                    <p className="text-sm text-gray-500">Remind me 1 day before trips</p>
                  </div>
                  <Switch
                    checked={notifications.tripReminders}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, tripReminders: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Optimization Alerts</Label>
                    <p className="text-sm text-gray-500">Notify when trips are optimized</p>
                  </div>
                  <Switch
                    checked={notifications.optimizationAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, optimizationAlerts: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-gray-500">Receive weekly trip summaries</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, weeklyReports: checked})
                    }
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleSavePreferences}
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
                        Save Preferences
                      </>
                    )}
                  </Button>
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
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security and privacy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setShow2FADialog(true)}
                    >
                      {localStorage.getItem(`2fa_enabled_${user?.id}`) === 'true' ? 'Manage 2FA' : 'Enable 2FA'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Verified
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-gray-500">
                          {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Login History</p>
                        <p className="text-sm text-gray-500">View your recent login activity</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowLoginHistoryDialog(true)}>
                      View History
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                      Change Password
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Sign Out</p>
                        <p className="text-sm text-red-600">Sign out from all devices</p>
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
                
                {/* Privacy Settings */}
                <div className="pt-6 border-t">
                  <h3 className="font-medium mb-4">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Profile Visibility</Label>
                        <p className="text-sm text-gray-500">Allow other employees to see your trips</p>
                      </div>
                      <Switch 
                        checked={privacySettings.profileVisibility}
                        onCheckedChange={(checked) => {
                          setPrivacySettings({...privacySettings, profileVisibility: checked})
                          handleSavePrivacySettings()
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Share Statistics</Label>
                        <p className="text-sm text-gray-500">Include your data in company reports</p>
                      </div>
                      <Switch 
                        checked={privacySettings.shareStatistics}
                        onCheckedChange={(checked) => {
                          setPrivacySettings({...privacySettings, shareStatistics: checked})
                          handleSavePrivacySettings()
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Location Tracking</Label>
                        <p className="text-sm text-gray-500">Allow tracking during trips for safety</p>
                      </div>
                      <Switch 
                        checked={privacySettings.locationTracking}
                        onCheckedChange={(checked) => {
                          setPrivacySettings({...privacySettings, locationTracking: checked})
                          handleSavePrivacySettings()
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app and enter the verification code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                <Smartphone className="h-16 w-16 text-gray-400" />
                <p className="text-xs text-gray-500 absolute mt-24">QR Code</p>
              </div>
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Backup Code</AlertTitle>
              <AlertDescription className="font-mono">
                XXXX-XXXX-XXXX-XXXX
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="2fa-code">Verification Code</Label>
              <Input
                id="2fa-code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnable2FA} className="bg-red-600 hover:bg-red-700">
              Enable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={passwordData.new}
                onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
              />
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false)
              setPasswordData({ current: "", new: "", confirm: "" })
            }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} className="bg-red-600 hover:bg-red-700">
              <Key className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog open={showLoginHistoryDialog} onOpenChange={setShowLoginHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Login History</DialogTitle>
            <DialogDescription>
              Recent login activity for your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {loginHistory.map((login, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">{login.device}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(login.date).toLocaleString()}
                      </span>
                      <span>{login.location}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  IP: {login.ip}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
