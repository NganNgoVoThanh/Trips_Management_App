"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTripForUser } from "@/components/admin/create-trip-for-user";
import { UserPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/header";

export default function AdminToolsPage() {
  const { data: session, status } = useSession();
  const [exporting, setExporting] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export-trips");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export");
      }

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trips_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export completed successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto py-8 px-4 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Quick Actions</h1>
          <p className="text-muted-foreground">
            Create trips for employees and export trip data for analysis
          </p>
        </div>

        <Tabs defaultValue="create-trip" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
            <TabsTrigger
              value="create-trip"
              className="flex items-center gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-600"
            >
              <UserPlus className="h-4 w-4" />
              Create Trip for Employee
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="flex items-center gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-600"
            >
              <Download className="h-4 w-4" />
              Export Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create-trip" className="mt-6">
            <CreateTripForUser />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Export Trip Data to Excel</h2>
              <p className="text-muted-foreground mb-6">
                Export all trip data to Excel file for analysis and reporting.
                The Excel file includes detailed information about trips, employees,
                approvals, and costs.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Data includes:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Trip information (departure, destination, time)</li>
                      <li>• Employee information (name, email, department)</li>
                      <li>• Approval status and history</li>
                      <li>• Manager and approver details</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Format:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Format: Microsoft Excel (.xlsx)</li>
                      <li>• Encoding: UTF-8 (Vietnamese support)</li>
                      <li>• Auto-adjusted column width</li>
                      <li>• Timestamps in Vietnam timezone</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {exporting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Exporting data...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export All Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
