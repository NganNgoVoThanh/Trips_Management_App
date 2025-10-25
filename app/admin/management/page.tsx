import type { Metadata } from "next"
import { AdminHeader } from "@/components/admin/header"
import { ManagementDashboard } from "@/components/admin/management-dashboard"

export const metadata: Metadata = {
  title: "System Management | Admin",
  description: "System configuration and management",
}

export default function ManagementPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="container flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-col space-y-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">System Management</h2>
            <p className="text-muted-foreground">
              Configure system settings, manage users, and monitor performance
            </p>
          </div>
          <ManagementDashboard />
        </div>
      </div>
    </div>
  )
}
