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
      toast.error(error.message || "Không thể tạo chuyến đi");
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Không có quyền truy cập
          </CardTitle>
          <CardDescription>Chỉ admin mới có thể tạo chuyến đi cho nhân viên khác</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Tạo chuyến đi cho nhân viên
        </CardTitle>
        <CardDescription>
          Admin có thể tạo chuyến đi thay mặt cho bất kỳ nhân viên nào
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="userEmail">Chọn nhân viên *</Label>
            <Select
              value={formData.userEmail}
              onValueChange={(value) => setFormData({ ...formData, userEmail: value })}
              disabled={loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Đang tải..." : "Chọn nhân viên"} />
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
              <Label htmlFor="departureLocation">Điểm đi *</Label>
              <Input
                id="departureLocation"
                value={formData.departureLocation}
                onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                placeholder="Vd: Hà Nội"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Điểm đến *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Vd: TP HCM"
                required
              />
            </div>
          </div>

          {/* Departure Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate">Ngày đi *</Label>
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime">Giờ đi *</Label>
              <Input
                id="departureTime"
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Return Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="returnDate">Ngày về *</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnTime">Giờ về *</Label>
              <Input
                id="returnTime"
                type="time"
                value={formData.returnTime}
                onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Mục đích chuyến đi</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Mô tả mục đích chuyến đi..."
              rows={3}
            />
          </div>

          {/* Vehicle Type */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Loại phương tiện</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn phương tiện" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Ô tô</SelectItem>
                <SelectItem value="plane">Máy bay</SelectItem>
                <SelectItem value="train">Tàu hỏa</SelectItem>
                <SelectItem value="bus">Xe khách</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Cost */}
          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Chi phí dự kiến (VNĐ)</Label>
            <Input
              id="estimatedCost"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              placeholder="0"
              min="0"
              step="1000"
            />
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails">CC Email (phân cách bằng dấu phẩy)</Label>
            <Input
              id="ccEmails"
              type="text"
              value={formData.ccEmails}
              onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo chuyến đi...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Tạo chuyến đi
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
