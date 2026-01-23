"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, UserPlus, AlertCircle, MapPin, Calendar, Clock, Car, UserCheck, UserCog } from "lucide-react";
import { config, getLocationName, calculateDistance, formatCurrency } from "@/lib/config";
import { fabricService, Trip } from "@/lib/fabric-client";

interface User {
  id: string;
  name: string;
  email: string;
  department: string | null;
  manager_email: string | null;
}

export function CreateTripForUser() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);

  // Toggle between selecting existing user vs manual entry
  const [isManualEntry, setIsManualEntry] = useState(false);

  const [formData, setFormData] = useState({
    // For existing users
    userEmail: "",

    // For manual entry (employees not in database yet)
    manualName: "",
    manualEmployeeId: "",
    manualDepartment: "",
    manualEmail: "",

    // Trip details
    departureLocation: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    purpose: "",
    vehicleType: "car-4",
    estimatedCost: "",
    ccEmails: [] as string[],
    ccEmailInput: "",
    notes: ""
  });

  // Memoize estimated cost calculation
  const estimatedCost = useMemo(() => {
    if (formData.departureLocation && formData.destination && formData.departureLocation !== formData.destination && formData.vehicleType) {
      const distance = calculateDistance(formData.departureLocation, formData.destination);
      const vehicle = config.vehicles[formData.vehicleType as keyof typeof config.vehicles];
      if (vehicle) {
        return distance * 2 * vehicle.costPerKm; // Round trip
      }
    }
    return 0;
  }, [formData.departureLocation, formData.destination, formData.vehicleType]);

  // Load available trips with debounce
  const loadAvailableTrips = useCallback(async () => {
    if (!formData.departureDate || !formData.departureLocation || !formData.destination) {
      setAvailableTrips([]);
      return;
    }

    try {
      const trips = await fabricService.getTrips({
        status: 'approved_solo'
      });

      const filtered = trips.filter(trip =>
        trip.departureDate === formData.departureDate &&
        trip.departureLocation === formData.departureLocation &&
        trip.destination === formData.destination
      );

      setAvailableTrips(filtered);
    } catch (error) {
      console.error('Error loading available trips:', error);
      setAvailableTrips([]);
    }
  }, [formData.departureDate, formData.departureLocation, formData.destination]);

  // Debounced effect for loading trips
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAvailableTrips();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [loadAvailableTrips]);

  // Load all users
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/azure-users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Memoized input change handler
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on mode
    if (!isManualEntry && !formData.userEmail) {
      toast.error("Please select an employee");
      return;
    }

    if (isManualEntry) {
      if (!formData.manualName || !formData.manualEmployeeId || !formData.manualDepartment) {
        toast.error("Please enter employee name, ID, and department");
        return;
      }

      // Optional email validation if provided
      if (formData.manualEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.manualEmail)) {
          toast.error("Please enter a valid email address");
          return;
        }
      }
    }

    if (formData.departureLocation === formData.destination) {
      toast.error("Departure location and destination cannot be the same");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-trip-for-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send based on mode
          userEmail: isManualEntry ? (formData.manualEmail || `employee-${formData.manualEmployeeId}@temp.local`) : formData.userEmail,
          userName: isManualEntry ? formData.manualName : undefined,
          userEmployeeId: isManualEntry ? formData.manualEmployeeId : undefined,
          userDepartment: isManualEntry ? formData.manualDepartment : undefined,
          isManualEntry: isManualEntry,

          // Trip details
          departureLocation: formData.departureLocation,
          destination: formData.destination,
          departureDate: formData.departureDate,
          departureTime: formData.departureTime,
          returnDate: formData.returnDate,
          returnTime: formData.returnTime,
          purpose: formData.purpose,
          vehicleType: formData.vehicleType,
          notes: formData.notes,
          ccEmails: formData.ccEmails,
          estimatedCost: estimatedCost > 0 ? estimatedCost : (formData.estimatedCost ? parseFloat(formData.estimatedCost) : null),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create trip");
      }

      toast.success(data.message || "Trip created successfully!");

      // Reset form
      setFormData({
        userEmail: "",
        manualName: "",
        manualEmployeeId: "",
        manualDepartment: "",
        manualEmail: "",
        departureLocation: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        returnDate: "",
        returnTime: "",
        purpose: "",
        vehicleType: "car-4",
        estimatedCost: "",
        ccEmails: [],
        ccEmailInput: "",
        notes: ""
      });
      setAvailableTrips([]);
    } catch (error: any) {
      console.error("Error creating trip:", error);
      toast.error(error.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.role !== "admin") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription className="text-red-700">
            Only administrators can create trips for other employees
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <UserPlus className="h-5 w-5 text-red-600" />
          Create Trip for Employee
        </CardTitle>
        <CardDescription>
          Create a business trip for employees (registered in system or pending email setup)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Mode - Improved UI */}
          <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
            <div className={`p-4 transition-colors ${isManualEntry ? 'bg-orange-50 border-b-2 border-orange-300' : 'bg-green-50 border-b-2 border-green-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isManualEntry ? 'bg-orange-600' : 'bg-green-600'}`}>
                    {isManualEntry ? (
                      <UserCog className="h-6 w-6 text-white" />
                    ) : (
                      <UserCheck className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <Label className={`text-base font-bold ${isManualEntry ? 'text-orange-900' : 'text-green-900'}`}>
                      {isManualEntry ? "📝 Manual Entry Mode" : "✓ Database Selection Mode"}
                    </Label>
                    <p className={`text-sm mt-1 font-medium ${isManualEntry ? 'text-orange-800' : 'text-green-800'}`}>
                      {isManualEntry
                        ? "For employees without email in database (new hires or pending setup)"
                        : "For employees already registered in the system"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {isManualEntry ? "Switch to Database" : "Switch to Manual"}
                  </span>
                  <Switch
                    checked={isManualEntry}
                    onCheckedChange={setIsManualEntry}
                    className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-green-600"
                  />
                </div>
              </div>
            </div>

            {/* Mode explanation */}
            <div className={`p-3 text-xs ${isManualEntry ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
              <strong>💡 Use this mode when:</strong> {isManualEntry
                ? "The employee hasn't been assigned a company email yet OR hasn't logged into the app for the first time."
                : "The employee is already in the database with email and login credentials."}
            </div>
          </div>

          {/* User Selection - Conditional Rendering */}
          {!isManualEntry ? (
            <div className="space-y-2">
              <Label htmlFor="userEmail" className="text-gray-900">
                Select Employee <span className="text-red-600">*</span>
              </Label>
              <Select
                value={formData.userEmail}
                onValueChange={(value) => handleInputChange('userEmail', value)}
                disabled={loadingUsers}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue placeholder={loadingUsers ? "Loading employees..." : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.name} ({user.email}) {user.department ? `- ${user.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  🔔 Employee Information Entry
                </p>
                <p className="text-xs text-orange-700">
                  Fill in the details for an employee who doesn't have an email in the database yet. Trip confirmation will be sent to the provided email (if available).
                </p>
              </div>

              {/* Manual Entry Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manualName" className="text-gray-900 font-medium">
                    Employee Full Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="manualName"
                    placeholder="e.g., Nguyen Van A"
                    value={formData.manualName}
                    onChange={(e) => handleInputChange('manualName', e.target.value)}
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualEmployeeId" className="text-gray-900 font-medium">
                    Employee ID <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="manualEmployeeId"
                    placeholder="e.g., EMP12345"
                    value={formData.manualEmployeeId}
                    onChange={(e) => handleInputChange('manualEmployeeId', e.target.value)}
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-gray-500">Unique identifier from HR system</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualDepartment" className="text-gray-900 font-medium">
                    Department <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="manualDepartment"
                    placeholder="e.g., Sales, Production, Logistics"
                    value={formData.manualDepartment}
                    onChange={(e) => handleInputChange('manualDepartment', e.target.value)}
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualEmail" className="text-gray-900 font-medium">
                    Email (Optional)
                  </Label>
                  <Input
                    id="manualEmail"
                    type="email"
                    placeholder="e.g., employee@intersnack.com.vn"
                    value={formData.manualEmail}
                    onChange={(e) => handleInputChange('manualEmail', e.target.value)}
                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    If provided, trip confirmation will be sent here
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Departure Location */}
            <div className="space-y-2">
              <Label htmlFor="departureLocation" className="text-gray-900">
                <MapPin className="inline h-4 w-4 mr-1" />
                Departure Location <span className="text-red-600">*</span>
              </Label>
              <Select
                value={formData.departureLocation}
                onValueChange={(value) => handleInputChange('departureLocation', value)}
                disabled={loading}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue placeholder="Select departure location" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.locations).map(([key, location]) => (
                    <SelectItem key={key} value={key}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination" className="text-gray-900">
                <MapPin className="inline h-4 w-4 mr-1" />
                Destination <span className="text-red-600">*</span>
              </Label>
              <Select
                value={formData.destination}
                onValueChange={(value) => handleInputChange('destination', value)}
                disabled={loading}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.locations).map(([key, location]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      disabled={key === formData.departureLocation}
                    >
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Departure Date */}
            <div className="space-y-2">
              <Label htmlFor="departureDate" className="text-gray-900">
                <Calendar className="inline h-4 w-4 mr-1" />
                Departure Date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureDate"
                type="date"
                min={getTomorrowDate()}
                value={formData.departureDate}
                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                disabled={loading}
                required
              />
            </div>

            {/* Departure Time */}
            <div className="space-y-2">
              <Label htmlFor="departureTime" className="text-gray-900">
                <Clock className="inline h-4 w-4 mr-1" />
                Departure Time <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => handleInputChange('departureTime', e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                disabled={loading}
                required
              />
            </div>

            {/* Return Date */}
            <div className="space-y-2">
              <Label htmlFor="returnDate" className="text-gray-900">
                <Calendar className="inline h-4 w-4 mr-1" />
                Return Date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="returnDate"
                type="date"
                min={formData.departureDate || getTomorrowDate()}
                value={formData.returnDate}
                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                disabled={loading}
                required
              />
            </div>

            {/* Return Time */}
            <div className="space-y-2">
              <Label htmlFor="returnTime" className="text-gray-900">
                <Clock className="inline h-4 w-4 mr-1" />
                Return Time <span className="text-red-600">*</span>
              </Label>
              <Input
                id="returnTime"
                type="time"
                value={formData.returnTime}
                onChange={(e) => handleInputChange('returnTime', e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                disabled={loading}
                required
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <Label htmlFor="vehicleType" className="text-gray-900">
                <Car className="inline h-4 w-4 mr-1" />
                Preferred Vehicle
              </Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => handleInputChange('vehicleType', value)}
                disabled={loading}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(config.vehicles).map(([key, vehicle]) => (
                    <SelectItem key={key} value={key}>
                      {vehicle.name} (Max {vehicle.capacity - 1} passengers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose" className="text-gray-900">
                Trip Purpose
              </Label>
              <Input
                id="purpose"
                placeholder="Example: Customer meeting, Factory inspection, Training..."
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* CC Emails Section */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails" className="text-gray-900">
              CC Email (Notification Recipients)
            </Label>
            <div className="flex gap-2">
              <Input
                id="ccEmailInput"
                type="email"
                placeholder="Enter email (e.g., colleague@intersnack.com.vn)"
                value={formData.ccEmailInput}
                onChange={(e) => handleInputChange('ccEmailInput', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const email = formData.ccEmailInput.trim();
                    if (email && email.includes('@')) {
                      setFormData(prev => ({
                        ...prev,
                        ccEmails: [...prev.ccEmails, email],
                        ccEmailInput: ''
                      }));
                    }
                  }
                }}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const email = formData.ccEmailInput.trim();
                  if (email && email.includes('@')) {
                    setFormData(prev => ({
                      ...prev,
                      ccEmails: [...prev.ccEmails, email],
                      ccEmailInput: ''
                    }));
                  }
                }}
                disabled={loading || !formData.ccEmailInput.trim().includes('@')}
              >
                + Add
              </Button>
            </div>
            {formData.ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.ccEmails.map((email, index) => (
                  <div
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          ccEmails: prev.ccEmails.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              These people will receive a copy of the trip confirmation email
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-900">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional information about this trip..."
              className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Cost Estimate */}
          {estimatedCost > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Estimated Cost (Round Trip):</p>
              <p className="text-2xl font-bold">{formatCurrency(estimatedCost)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Distance: {formData.departureLocation && formData.destination ?
                  `${calculateDistance(formData.departureLocation, formData.destination) * 2} km` :
                  'N/A'}
              </p>
            </div>
          )}

          {/* Available Trips */}
          {availableTrips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                Similar trips on this date ({availableTrips.length}):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableTrips.map((trip) => (
                  <div key={trip.id} className="text-sm">
                    • {trip.userName} - {trip.departureTime}
                    ({trip.status === 'optimized' ? 'Optimized' : 'Confirmed'})
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                This trip may be combined with these for cost optimization
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !formData.departureLocation || !formData.destination}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating trip...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {isManualEntry ? "Create Trip (Manual Entry)" : "Create Trip"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
