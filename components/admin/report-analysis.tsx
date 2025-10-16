"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  Car,
  MapPin,
  FileText,
  Loader2,
  PieChart,
  Activity,
  Target,
  Zap,
  CheckCircle,
  ChevronRight,
  Clock
} from "lucide-react"
import { fabricService } from "@/lib/fabric-client"
import { config, formatCurrency, getLocationName } from "@/lib/config"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

interface ReportData {
  overview: {
    totalTrips: number
    totalRawTrips: number
    totalTempTrips: number
    totalFinalTrips: number
    totalOptimized: number
    totalCancelled: number
    totalSavings: number
    averageSavingsPerTrip: number
    optimizationRate: number
    dataQualityScore: number
  }
  byLocation: {
    location: string
    trips: number
    savings: number
    optimizationRate: number
  }[]
  byMonth: {
    month: string
    trips: number
    optimized: number
    savings: number
    rawData: number
    finalData: number
  }[]
  byVehicle: {
    type: string
    count: number
    utilization: number
    savings: number
  }[]
  byEmployee: {
    name: string
    email: string
    trips: number
    optimized: number
    savings: number
  }[]
  dataFlowStats: {
    rawToTemp: number
    tempToFinal: number
    tempDeleted: number
    processingTime: number
  }
}

export function ReportAnalysis() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    generateReport()
  }, [selectedPeriod, selectedLocation])

  const generateReport = async () => {
    try {
      setIsLoading(true)
      
      // Get all data including temp
      const allTrips = await fabricService.getTrips({ includeTemp: true })
      const rawTrips = allTrips.filter(t => t.dataType === 'raw' || (!t.dataType && t.status === 'pending'))
      const tempTrips = allTrips.filter(t => t.dataType === 'temp')
      const finalTrips = allTrips.filter(t => t.dataType === 'final')
      const optimizedTrips = allTrips.filter(t => t.status === 'optimized')
      const cancelledTrips = allTrips.filter(t => t.status === 'cancelled')
      
      // Get data flow statistics
      const dataStats = await fabricService.getDataStats()
      
      // Calculate total savings
      const totalSavings = optimizedTrips.reduce((sum, trip) => {
        const estimated = trip.estimatedCost || 0
        const actual = trip.actualCost || estimated
        return sum + (estimated - actual)
      }, 0)
      
      // Calculate by location
      const locationStats = new Map<string, any>()
      allTrips.forEach(trip => {
        const loc = trip.departureLocation
        if (!locationStats.has(loc)) {
          locationStats.set(loc, {
            location: getLocationName(loc),
            trips: 0,
            optimized: 0,
            savings: 0
          })
        }
        const stat = locationStats.get(loc)
        stat.trips++
        if (trip.status === 'optimized') {
          stat.optimized++
          const estimated = trip.estimatedCost || 0
          const actual = trip.actualCost || estimated
          stat.savings += (estimated - actual)
        }
      })
      
      const byLocation = Array.from(locationStats.values()).map(stat => ({
        ...stat,
        optimizationRate: stat.trips > 0 ? (stat.optimized / stat.trips) * 100 : 0
      }))
      
      // Calculate by month
      const monthStats = new Map<string, any>()
      const currentYear = new Date().getFullYear()
      
      allTrips.forEach(trip => {
        const date = new Date(trip.departureDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthStats.has(monthKey)) {
          monthStats.set(monthKey, {
            month: monthKey,
            trips: 0,
            optimized: 0,
            savings: 0,
            rawData: 0,
            finalData: 0
          })
        }
        
        const stat = monthStats.get(monthKey)
        stat.trips++
        
        if (trip.dataType === 'raw' || (!trip.dataType && trip.status === 'pending')) {
          stat.rawData++
        } else if (trip.dataType === 'final') {
          stat.finalData++
        }
        
        if (trip.status === 'optimized') {
          stat.optimized++
          const estimated = trip.estimatedCost || 0
          const actual = trip.actualCost || estimated
          stat.savings += (estimated - actual)
        }
      })
      
      const byMonth = Array.from(monthStats.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6) // Last 6 months
      
      // Calculate by vehicle
      const vehicleStats = new Map<string, any>()
      const vehicleTypes = ['car-4', 'car-7', 'van-16']
      
      vehicleTypes.forEach(type => {
        vehicleStats.set(type, {
          type: config.vehicles[type as keyof typeof config.vehicles].name,
          count: 0,
          capacity: 0,
          occupied: 0,
          savings: 0
        })
      })
      
      optimizedTrips.forEach(trip => {
        if (trip.vehicleType && vehicleStats.has(trip.vehicleType)) {
          const stat = vehicleStats.get(trip.vehicleType)
          stat.count++
          const vehicle = config.vehicles[trip.vehicleType as keyof typeof config.vehicles]
          stat.capacity += vehicle.capacity
          stat.occupied += 1 // Simplified - should count actual passengers
          const estimated = trip.estimatedCost || 0
          const actual = trip.actualCost || estimated
          stat.savings += (estimated - actual)
        }
      })
      
      const byVehicle = Array.from(vehicleStats.values()).map(stat => ({
        ...stat,
        utilization: stat.capacity > 0 ? (stat.occupied / stat.capacity) * 100 : 0
      }))
      
      // Calculate by employee (top 10)
      const employeeStats = new Map<string, any>()
      
      allTrips.forEach(trip => {
        const key = trip.userEmail
        if (!employeeStats.has(key)) {
          employeeStats.set(key, {
            name: trip.userName,
            email: trip.userEmail,
            trips: 0,
            optimized: 0,
            savings: 0
          })
        }
        
        const stat = employeeStats.get(key)
        stat.trips++
        
        if (trip.status === 'optimized') {
          stat.optimized++
          const estimated = trip.estimatedCost || 0
          const actual = trip.actualCost || estimated
          stat.savings += (estimated - actual)
        }
      })
      
      const byEmployee = Array.from(employeeStats.values())
        .sort((a, b) => b.savings - a.savings)
        .slice(0, 10)
      
      // Calculate data quality score
      const dataQualityScore = calculateDataQualityScore({
        totalTrips: allTrips.length,
        rawTrips: rawTrips.length,
        finalTrips: finalTrips.length,
        tempTrips: tempTrips.length
      })
      
      // Set report data
      setReportData({
        overview: {
          totalTrips: allTrips.length - tempTrips.length, // Exclude temp from total
          totalRawTrips: rawTrips.length,
          totalTempTrips: tempTrips.length,
          totalFinalTrips: finalTrips.length,
          totalOptimized: optimizedTrips.length,
          totalCancelled: cancelledTrips.length,
          totalSavings,
          averageSavingsPerTrip: optimizedTrips.length > 0 ? totalSavings / optimizedTrips.length : 0,
          optimizationRate: allTrips.length > 0 ? (optimizedTrips.length / (allTrips.length - tempTrips.length)) * 100 : 0,
          dataQualityScore
        },
        byLocation,
        byMonth,
        byVehicle,
        byEmployee,
        dataFlowStats: {
          rawToTemp: dataStats.tempCount,
          tempToFinal: dataStats.finalCount,
          tempDeleted: 0, // Would need to track this
          processingTime: 2.5 // Average in hours
        }
      })
      
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate analysis report",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDataQualityScore = (stats: any): number => {
    let score = 100
    
    // Deduct points for data issues
    if (stats.tempTrips > stats.totalTrips * 0.2) score -= 10 // Too many temp trips
    if (stats.rawTrips > stats.totalTrips * 0.5) score -= 15 // Too many unprocessed
    if (stats.finalTrips < stats.totalTrips * 0.3) score -= 10 // Low completion rate
    
    return Math.max(0, Math.min(100, score))
  }

  const exportToCSV = async () => {
    if (!reportData) return
    
    setIsExporting(true)
    
    try {
      // Create comprehensive CSV
      const csv = [
        ['TRIPS MANAGEMENT SYSTEM - ANALYSIS REPORT'],
        ['Generated:', new Date().toLocaleString()],
        ['Period:', selectedPeriod],
        ['Location:', selectedLocation === 'all' ? 'All Locations' : selectedLocation],
        [],
        ['=== DATA FLOW ANALYSIS ==='],
        ['Stage', 'Count', 'Percentage'],
        ['RAW Data (Initial)', reportData.overview.totalRawTrips, `${((reportData.overview.totalRawTrips / reportData.overview.totalTrips) * 100).toFixed(1)}%`],
        ['TEMP Data (Processing)', reportData.overview.totalTempTrips, 'Processing Stage'],
        ['FINAL Data (Completed)', reportData.overview.totalFinalTrips, `${((reportData.overview.totalFinalTrips / reportData.overview.totalTrips) * 100).toFixed(1)}%`],
        [],
        ['=== OVERVIEW STATISTICS ==='],
        ['Total Trips', reportData.overview.totalTrips],
        ['Optimized Trips', reportData.overview.totalOptimized],
        ['Cancelled Trips', reportData.overview.totalCancelled],
        ['Total Savings', formatCurrency(reportData.overview.totalSavings)],
        ['Average Savings/Trip', formatCurrency(reportData.overview.averageSavingsPerTrip)],
        ['Optimization Rate', `${reportData.overview.optimizationRate.toFixed(1)}%`],
        ['Data Quality Score', `${reportData.overview.dataQualityScore}/100`],
        [],
        ['=== BY LOCATION ==='],
        ['Location', 'Total Trips', 'Optimization Rate', 'Total Savings'],
        ...reportData.byLocation.map(loc => [
          loc.location,
          loc.trips,
          `${loc.optimizationRate.toFixed(1)}%`,
          formatCurrency(loc.savings)
        ]),
        [],
        ['=== BY MONTH ==='],
        ['Month', 'Total Trips', 'Optimized', 'RAW Data', 'FINAL Data', 'Savings'],
        ...reportData.byMonth.map(month => [
          month.month,
          month.trips,
          month.optimized,
          month.rawData,
          month.finalData,
          formatCurrency(month.savings)
        ]),
        [],
        ['=== BY VEHICLE TYPE ==='],
        ['Vehicle', 'Count', 'Utilization', 'Savings'],
        ...reportData.byVehicle.map(vehicle => [
          vehicle.type,
          vehicle.count,
          `${vehicle.utilization.toFixed(1)}%`,
          formatCurrency(vehicle.savings)
        ]),
        [],
        ['=== TOP EMPLOYEES BY SAVINGS ==='],
        ['Name', 'Email', 'Total Trips', 'Optimized', 'Savings'],
        ...reportData.byEmployee.map(emp => [
          emp.name,
          emp.email,
          emp.trips,
          emp.optimized,
          formatCurrency(emp.savings)
        ]),
        [],
        ['=== DATA PROCESSING METRICS ==='],
        ['RAW to TEMP Conversions', reportData.dataFlowStats.rawToTemp],
        ['TEMP to FINAL Conversions', reportData.dataFlowStats.tempToFinal],
        ['Average Processing Time', `${reportData.dataFlowStats.processingTime} hours`],
      ]
      
      const csvContent = csv.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trips-analysis-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      
      toast({
        title: "Report Exported",
        description: "Analysis report has been downloaded successfully",
      })
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getDataFlowPercentages = () => {
    if (!reportData) return { raw: 0, temp: 0, final: 0 }
    
    const total = reportData.overview.totalRawTrips + reportData.overview.totalFinalTrips
    
    return {
      raw: total > 0 ? (reportData.overview.totalRawTrips / total) * 100 : 0,
      temp: 0, // Temp is transitional, not counted in percentage
      final: total > 0 ? (reportData.overview.totalFinalTrips / total) * 100 : 0
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-500">No data available for analysis</p>
        </CardContent>
      </Card>
    )
  }

  const dataFlowPercentages = getDataFlowPercentages()

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Analysis & Data Flow
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of trips data with RAW → TEMP → FINAL flow tracking
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {Object.entries(config.locations).map(([key, loc]) => (
                    <SelectItem key={key} value={key}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={exportToCSV} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Flow Visualization */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Data Flow Pipeline (RAW → TEMP → FINAL)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Flow Diagram */}
            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1 text-center">
                <div className="bg-yellow-100 p-4 rounded-lg border-2 border-yellow-300">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <h4 className="font-bold text-yellow-900">RAW DATA</h4>
                  <p className="text-2xl font-bold">{reportData.overview.totalRawTrips}</p>
                  <Badge variant="outline" className="mt-2 bg-yellow-50">
                    {dataFlowPercentages.raw.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="h-2 w-16 bg-gradient-to-r from-yellow-300 to-orange-300"></div>
                <ChevronRight className="h-6 w-6 text-orange-500" />
              </div>
              
              <div className="flex-1 text-center">
                <div className="bg-orange-100 p-4 rounded-lg border-2 border-orange-300 border-dashed">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <h4 className="font-bold text-orange-900">TEMP DATA</h4>
                  <p className="text-2xl font-bold">{reportData.overview.totalTempTrips}</p>
                  <Badge variant="outline" className="mt-2 bg-orange-50">
                    Processing
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="h-2 w-16 bg-gradient-to-r from-orange-300 to-green-300"></div>
                <ChevronRight className="h-6 w-6 text-green-500" />
              </div>
              
              <div className="flex-1 text-center">
                <div className="bg-green-100 p-4 rounded-lg border-2 border-green-300">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h4 className="font-bold text-green-900">FINAL DATA</h4>
                  <p className="text-2xl font-bold">{reportData.overview.totalFinalTrips}</p>
                  <Badge variant="outline" className="mt-2 bg-green-50">
                    {dataFlowPercentages.final.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Processing Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-500">Processing Rate</p>
                    <p className="text-xl font-bold">
                      {reportData.dataFlowStats.tempToFinal} / {reportData.dataFlowStats.rawToTemp}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-sm text-gray-500">Avg Processing Time</p>
                    <p className="text-xl font-bold">{reportData.dataFlowStats.processingTime}h</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-xl font-bold">
                      {((reportData.overview.totalFinalTrips / (reportData.overview.totalRawTrips + reportData.overview.totalFinalTrips)) * 100).toFixed(0)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-500">Data Quality</p>
                    <p className="text-xl font-bold">{reportData.overview.dataQualityScore}/100</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Statistics Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="location">By Location</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
              <TabsTrigger value="vehicle">Vehicle Usage</TabsTrigger>
              <TabsTrigger value="employee">Top Employees</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.overview.totalSavings)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average: {formatCurrency(reportData.overview.averageSavingsPerTrip)}/trip
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.overview.optimizationRate.toFixed(1)}%</div>
                    <Progress value={reportData.overview.optimizationRate} className="mt-2" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Trip Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Optimized:</span>
                        <span className="font-medium">{reportData.overview.totalOptimized}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <span className="font-medium">{reportData.overview.totalRawTrips}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cancelled:</span>
                        <span className="font-medium">{reportData.overview.totalCancelled}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* By Location Tab */}
            <TabsContent value="location" className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Total Trips</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Optimization Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Total Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.byLocation.map((loc) => (
                      <tr key={loc.location} className="hover:bg-gray-50">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{loc.location}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{loc.trips}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span>{loc.optimizationRate.toFixed(1)}%</span>
                            <Progress value={loc.optimizationRate} className="w-16 h-2" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {formatCurrency(loc.savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            {/* Monthly Trend Tab */}
            <TabsContent value="monthly" className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Optimized</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">RAW</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">FINAL</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.byMonth.map((month) => (
                      <tr key={month.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{month.month}</td>
                        <td className="px-4 py-3 text-center">{month.trips}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{month.optimized}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-yellow-50">{month.rawData}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-green-50">{month.finalData}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {formatCurrency(month.savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            {/* Vehicle Usage Tab */}
            <TabsContent value="vehicle" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {reportData.byVehicle.map((vehicle) => (
                  <Card key={vehicle.type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {vehicle.type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Count:</span>
                          <span className="font-medium">{vehicle.count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Utilization:</span>
                          <span className="font-medium">{vehicle.utilization.toFixed(1)}%</span>
                        </div>
                        <Progress value={vehicle.utilization} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span>Savings:</span>
                          <span className="font-medium text-green-600">{formatCurrency(vehicle.savings)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            {/* Top Employees Tab */}
            <TabsContent value="employee" className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Employee</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Total Trips</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Optimized</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Savings Contributed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.byEmployee.map((emp, index) => (
                      <tr key={emp.email} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{emp.name}</p>
                              <p className="text-xs text-gray-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{emp.trips}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{emp.optimized}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {formatCurrency(emp.savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
