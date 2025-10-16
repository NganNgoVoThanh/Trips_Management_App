"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Users, 
  Database, 
  Settings, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  MapPin,
  RefreshCw,
  Loader2
} from "lucide-react"
import { fabricService } from "@/lib/fabric-client"
import { config } from "@/lib/config"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function ManagementDashboard() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [stats, setStats] = useState({
    totalTrips: 0,
    pendingTrips: 0,
    optimizedTrips: 0,
    totalUsers: 0,
    totalSavings: 0,
    optimizationRate: 0
  })
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [settings, setSettings] = useState({
    autoOptimization: false,
    emailNotifications: true,
    maxWaitTime: 30,
    minSavingsPercentage: 15
  })

  useEffect(() => {
    loadData()
    checkConnection()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load statistics
      const trips = await fabricService.getTrips()
      const groups = await fabricService.getOptimizationGroups()
      
      // Calculate stats
      const pendingTrips = trips.filter(t => t.status === 'pending').length
      const optimizedTrips = trips.filter(t => t.status === 'optimized').length
      const totalSavings = groups
        .filter(g => g.status === 'approved')
        .reduce((sum, g) => sum + g.estimatedSavings, 0)
      
      // Get unique users
      const uniqueUsers = new Set(trips.map(t => t.userEmail))
      
      setStats({
        totalTrips: trips.length,
        pendingTrips,
        optimizedTrips,
        totalUsers: uniqueUsers.size,
        totalSavings,
        optimizationRate: trips.length > 0 ? (optimizedTrips / trips.length) * 100 : 0
      })
      
      // Load admin emails
      setAdminEmails(config.adminEmails)
      
      // Load settings
      const savedSettings = localStorage.getItem('systemSettings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load system data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkConnection = async () => {
    setConnectionStatus('checking')
    try {
      await fabricService.getTrips()
      setConnectionStatus('connected')
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  const addAdminEmail = () => {
    if (!newAdminEmail || !newAdminEmail.endsWith(config.companyDomain)) {
      toast({
        title: "Invalid Email",
        description: `Email must end with ${config.companyDomain}`,
        variant: "destructive"
      })
      return
    }
    
    if (adminEmails.includes(newAdminEmail)) {
      toast({
        title: "Email Exists",
        description: "This email is already an admin",
        variant: "destructive"
      })
      return
    }
    
    const updatedEmails = [...adminEmails, newAdminEmail]
    setAdminEmails(updatedEmails)
    config.adminEmails = updatedEmails
    setNewAdminEmail("")
    
    toast({
      title: "Admin Added",
      description: `${newAdminEmail} has been granted admin access`,
    })
  }

  const removeAdminEmail = (email: string) => {
    const updatedEmails = adminEmails.filter(e => e !== email)
    setAdminEmails(updatedEmails)
    config.adminEmails = updatedEmails
    
    toast({
      title: "Admin Removed",
      description: `${email} no longer has admin access`,
    })
  }

  const saveSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(settings))
    
    // Update config
    config.optimization.maxWaitTime = settings.maxWaitTime
    config.optimization.minSavingsPercentage = settings.minSavingsPercentage
    
    toast({
      title: "Settings Saved",
      description: "System settings have been updated",
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
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
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <span>Database Connection:</span>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="outline" className="bg-green-50">OneLake Connected</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <Badge variant="outline" className="bg-yellow-50">Local Storage</Badge>
                </>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={checkConnection}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTrips} pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSavings)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.optimizationRate.toFixed(1)}% optimization rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Admin Users Tab */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>Manage users with admin access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="admin@intersnack.com.vn"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <Button onClick={addAdminEmail}>Add Admin</Button>
              </div>
              
              <div className="space-y-2">
                {adminEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 border rounded">
                    <span>{email}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeAdminEmail(email)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Company Locations</CardTitle>
              <CardDescription>Manage office and factory locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.locations).map(([key, location]) => (
                  <div key={key} className="p-4 border rounded">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{location.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{location.address}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Lat: {location.coordinates.lat}</span>
                          <span>Lng: {location.coordinates.lng}</span>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {location.type === 'office' ? 'Office' : 'Factory'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Vehicles Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Types</CardTitle>
              <CardDescription>Configure available vehicle types and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.vehicles).map(([key, vehicle]) => (
                  <div key={key} className="p-4 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{vehicle.name}</h4>
                        <p className="text-sm text-gray-500">
                          Capacity: {vehicle.capacity} passengers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(vehicle.costPerKm)}/km</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure optimization and notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-optimization">Auto Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically run optimization for new trips
                  </p>
                </div>
                <Switch
                  id="auto-optimization"
                  checked={settings.autoOptimization}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, autoOptimization: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, emailNotifications: checked})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-wait">Max Wait Time (minutes)</Label>
                <Input
                  id="max-wait"
                  type="number"
                  value={settings.maxWaitTime}
                  onChange={(e) => 
                    setSettings({...settings, maxWaitTime: parseInt(e.target.value)})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min-savings">Minimum Savings (%)</Label>
                <Input
                  id="min-savings"
                  type="number"
                  value={settings.minSavingsPercentage}
                  onChange={(e) => 
                    setSettings({...settings, minSavingsPercentage: parseInt(e.target.value)})
                  }
                />
              </div>
              
              <Button onClick={saveSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
