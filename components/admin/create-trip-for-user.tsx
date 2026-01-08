"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

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

  const [formData, setFormData] = useState({
    userEmail: "",
    departureLocation: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    purpose: "",
    vehicleType: "",
    estimatedCost: "",
    ccEmails: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userEmail) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-trip-for-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ccEmails: formData.ccEmails
            ? formData.ccEmails.split(",").map((e) => e.trim()).filter(Boolean)
            : [],
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
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
        departureLocation: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        returnDate: "",
        returnTime: "",
        purpose: "",
        vehicleType: "",
        estimatedCost: "",
        ccEmails: "",
      });
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
          Create a business trip on behalf of any employee in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="userEmail" className="text-gray-900">
              Select Employee <span className="text-red-600">*</span>
            </Label>
            <Select
              value={formData.userEmail}
              onValueChange={(value) => setFormData({ ...formData, userEmail: value })}
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

          {/* Trip Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureLocation" className="text-gray-900">
                Departure Location <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureLocation"
                value={formData.departureLocation}
                onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                placeholder="e.g. Hanoi"
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="text-gray-900">
                Destination <span className="text-red-600">*</span>
              </Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g. Ho Chi Minh City"
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Departure Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate" className="text-gray-900">
                Departure Date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime" className="text-gray-900">
                Departure Time <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Return Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="returnDate" className="text-gray-900">
                Return Date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnTime" className="text-gray-900">
                Return Time <span className="text-red-600">*</span>
              </Label>
              <Input
                id="returnTime"
                type="time"
                value={formData.returnTime}
                onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose" className="text-gray-900">Trip Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Describe the purpose of this business trip..."
              className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              rows={3}
            />
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType" className="text-gray-900">Vehicle Type</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
            >
              <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="plane">Airplane</SelectItem>
                <SelectItem value="train">Train</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Cost */}
          <div className="space-y-2">
            <Label htmlFor="estimatedCost" className="text-gray-900">Estimated Cost (VND)</Label>
            <Input
              id="estimatedCost"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              placeholder="0"
              className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              min="0"
              step="1000"
            />
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails" className="text-gray-900">CC Emails (comma-separated)</Label>
            <Input
              id="ccEmails"
              type="text"
              value={formData.ccEmails}
              onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })}
              placeholder="email1@example.com, email2@example.com"
              className="border-gray-300 focus:border-red-500 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500">Additional email addresses to notify about this trip</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
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
                Create Trip
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
