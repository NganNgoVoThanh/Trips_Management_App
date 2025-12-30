"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Car, AlertCircle } from "lucide-react";

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
  trips_count: number;
}

interface VehicleAssignmentProps {
  tripId: string;
  currentVehicleId?: string;
  currentVehicleType?: string;
  departureDate: string;
  onAssigned?: () => void;
}

export function VehicleAssignment({
  tripId,
  currentVehicleId,
  currentVehicleType,
  departureDate,
  onAssigned,
}: VehicleAssignmentProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: currentVehicleId || "",
    vehicleType: currentVehicleType || "",
    notes: "",
  });

  // Load available vehicles when dialog opens
  useEffect(() => {
    if (open) {
      loadVehicles();
    }
  }, [open, departureDate]);

  const loadVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const res = await fetch(
        `/api/admin/assign-vehicle?date=${departureDate}${formData.vehicleType ? `&type=${formData.vehicleType}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast.error("Không thể tải danh sách phương tiện");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId && !formData.vehicleType) {
      toast.error("Vui lòng chọn phương tiện hoặc loại phương tiện");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/assign-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to assign vehicle");
      }

      toast.success("Phân công phương tiện thành công!");
      setOpen(false);
      onAssigned?.();
    } catch (error: any) {
      console.error("Error assigning vehicle:", error);
      toast.error(error.message || "Không thể phân công phương tiện");
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Car className="mr-2 h-4 w-4" />
          {currentVehicleId ? "Thay đổi phương tiện" : "Phân công phương tiện"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Phân công phương tiện</DialogTitle>
          <DialogDescription>
            Chọn phương tiện cho chuyến đi ngày {departureDate}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Loại phương tiện</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) => {
                setFormData({ ...formData, vehicleType: value });
                loadVehicles();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả loại phương tiện" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                <SelectItem value="car">Ô tô</SelectItem>
                <SelectItem value="van">Xe van</SelectItem>
                <SelectItem value="bus">Xe bus</SelectItem>
                <SelectItem value="truck">Xe tải</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Chọn phương tiện</Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
              disabled={loadingVehicles}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingVehicles ? "Đang tải..." : "Chọn phương tiện"}
                />
              </SelectTrigger>
              <SelectContent>
                {vehicles.length === 0 && !loadingVehicles && (
                  <div className="p-2 text-sm text-muted-foreground">
                    Không có phương tiện khả dụng
                  </div>
                )}
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {vehicle.vehicle_number} - {vehicle.vehicle_type}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({vehicle.trips_count} chuyến)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Vehicle Info */}
          {formData.vehicleId && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              {(() => {
                const selected = vehicles.find((v) => v.id === formData.vehicleId);
                if (!selected) return null;
                return (
                  <>
                    <div className="text-sm font-medium">Thông tin phương tiện:</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Số xe: {selected.vehicle_number}</div>
                      <div>Loại: {selected.vehicle_type}</div>
                      <div>Sức chứa: {selected.capacity} người</div>
                      {selected.driver_name && (
                        <div>Tài xế: {selected.driver_name}</div>
                      )}
                      {selected.driver_phone && (
                        <div>SĐT: {selected.driver_phone}</div>
                      )}
                      <div className="text-amber-600 font-medium">
                        Đã có {selected.trips_count} chuyến trong ngày
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ghi chú về việc phân công phương tiện..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Phân công
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
