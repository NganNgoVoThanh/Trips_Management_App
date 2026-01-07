"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Car, Plus, Edit, Trash2, Power, PowerOff, Loader2, Truck } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
  notes: string | null;
  created_at: string;
}

export default function VehiclesPage() {
  const { data: session, status } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: "",
    vehicle_type: "car",
    capacity: "4",
    driver_name: "",
    driver_phone: "",
    notes: "",
  });

  const vehicleTypeLabels: Record<string, string> = {
    car: "Car",
    van: "Van",
    bus: "Bus",
    truck: "Truck",
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadVehicles();
    }
  }, [status]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add vehicle");
      }

      toast.success("Vehicle added successfully!");
      setAddDialogOpen(false);
      setFormData({
        vehicle_number: "",
        vehicle_type: "car",
        capacity: "4",
        driver_name: "",
        driver_phone: "",
        notes: "",
      });
      loadVehicles();
    } catch (error: any) {
      toast.error(error.message || "Failed to add vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/vehicles/${selectedVehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update vehicle");
      }

      toast.success("Vehicle updated successfully!");
      setEditDialogOpen(false);
      setSelectedVehicle(null);
      loadVehicles();
    } catch (error: any) {
      toast.error(error.message || "Failed to update vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (vehicle: Vehicle) => {
    const newStatus = vehicle.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle status");
      }

      toast.success(
        newStatus === "active" ? "Vehicle activated" : "Vehicle deactivated"
      );
      loadVehicles();
    } catch (error) {
      toast.error("Failed to change status");
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/vehicles/${selectedVehicle.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete vehicle");
      }

      toast.success("Vehicle deleted successfully!");
      setDeleteDialogOpen(false);
      setSelectedVehicle(null);
      loadVehicles();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity.toString(),
      driver_name: vehicle.driver_name || "",
      driver_phone: vehicle.driver_phone || "",
      notes: vehicle.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteDialogOpen(true);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const inactiveVehicles = vehicles.filter((v) => v.status === "inactive").length;

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto py-8 px-4 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transportation Service Providers</h1>
          <p className="text-muted-foreground">
            Manage external vendors and transportation service providers for business trips
          </p>
        </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-l-red-600 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Providers</CardTitle>
            <Truck className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{vehicles.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              Registered service providers
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active</CardTitle>
            <Power className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeVehicles}</div>
            <p className="text-xs text-gray-500 mt-1">
              Available for booking
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-400 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Inactive</CardTitle>
            <PowerOff className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{inactiveVehicles}</div>
            <p className="text-xs text-gray-500 mt-1">
              Temporarily unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Service Providers</h2>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Transportation Service Provider</DialogTitle>
              <DialogDescription>
                Register a new external vendor or transportation service provider
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Plate / ID *</Label>
                <Input
                  id="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_number: e.target.value })
                  }
                  placeholder="e.g. 29A-12345 or VENDOR-001"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  License plate number or vendor reference ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicle_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (persons) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_name">Driver / Contact Person</Label>
                <Input
                  id="driver_name"
                  value={formData.driver_name}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_name: e.target.value })
                  }
                  placeholder="Driver name or vendor contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_phone">Contact Phone</Label>
                <Input
                  id="driver_phone"
                  value={formData.driver_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_phone: e.target.value })
                  }
                  placeholder="+84 xxx xxx xxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Vendor Info</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Company name, special requirements, etc."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Provider"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service providers registered yet</p>
              <p className="text-sm mt-2">Click "Add Provider" to register your first transportation vendor</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle / ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Driver / Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      {vehicle.vehicle_number}
                      {vehicle.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {vehicle.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}</TableCell>
                    <TableCell>{vehicle.capacity} pax</TableCell>
                    <TableCell>{vehicle.driver_name || "-"}</TableCell>
                    <TableCell>{vehicle.driver_phone || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={vehicle.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
                      >
                        {vehicle.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(vehicle)}
                          title={vehicle.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {vehicle.status === "active" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(vehicle)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Service Provider</DialogTitle>
            <DialogDescription>
              Update transportation service provider information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_vehicle_number">Vehicle Plate / ID *</Label>
              <Input
                id="edit_vehicle_number"
                value={formData.vehicle_number}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_number: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_vehicle_type">Vehicle Type *</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, vehicle_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_capacity">Capacity (persons) *</Label>
              <Input
                id="edit_capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_driver_name">Driver / Contact Person</Label>
              <Input
                id="edit_driver_name"
                value={formData.driver_name}
                onChange={(e) =>
                  setFormData({ ...formData, driver_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_driver_phone">Contact Phone</Label>
              <Input
                id="edit_driver_phone"
                value={formData.driver_phone}
                onChange={(e) =>
                  setFormData({ ...formData, driver_phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes / Vendor Info</Label>
              <Input
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">{selectedVehicle?.vehicle_number}</span>{" "}
              from the system?
              <br />
              <br />
              This action cannot be undone. The provider can only be deleted if not currently
              assigned to any active trips.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Provider"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
