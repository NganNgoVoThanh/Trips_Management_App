"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTripForUser } from "@/components/admin/create-trip-for-user";
import { UserPlus, Car, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminToolsPage() {
  const { data: session, status } = useSession();
  const [exporting, setExporting] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải...</p>
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

      toast.success("Xuất dữ liệu thành công!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Không thể xuất dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Công cụ Admin</h1>
        <p className="text-muted-foreground">
          Quản lý chuyến đi, phương tiện và xuất báo cáo
        </p>
      </div>

      <Tabs defaultValue="create-trip" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create-trip" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tạo chuyến đi
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Quản lý xe
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Xuất dữ liệu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create-trip" className="mt-6">
          <CreateTripForUser />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Quản lý phương tiện</h2>
            <p className="text-muted-foreground mb-4">
              Tính năng quản lý xe sẽ được tích hợp vào bảng danh sách chuyến đi.
              Bạn có thể phân công xe trực tiếp từ chi tiết chuyến đi.
            </p>
            <Button onClick={() => (window.location.href = "/admin/management")}>
              Đi tới Quản lý chuyến đi
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Xuất dữ liệu Excel</h2>
            <p className="text-muted-foreground mb-6">
              Xuất toàn bộ dữ liệu chuyến đi ra file Excel để phân tích và báo cáo.
              File Excel sẽ bao gồm tất cả thông tin chi tiết về chuyến đi, nhân viên,
              phê duyệt và chi phí.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Dữ liệu bao gồm:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Thông tin chuyến đi (điểm đi, điểm đến, thời gian)</li>
                    <li>• Thông tin nhân viên (tên, email, phòng ban)</li>
                    <li>• Trạng thái phê duyệt</li>
                    <li>• Thông tin quản lý và người phê duyệt</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Định dạng:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Định dạng: Microsoft Excel (.xlsx)</li>
                    <li>• Mã hóa: UTF-8 (hỗ trợ tiếng Việt)</li>
                    <li>• Kích thước cột tự động điều chỉnh</li>
                    <li>• Ngày giờ theo định dạng Việt Nam</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={exporting}
                size="lg"
                className="w-full"
              >
                {exporting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Đang xuất dữ liệu...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Xuất toàn bộ dữ liệu
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
