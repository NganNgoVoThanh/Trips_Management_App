// app/admin/dashboard/page.tsx
import type { Metadata } from "next"
import { AdminDashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard | Trips Management",
  description: "Manage and optimize company trips",
}

export default function AdminDashboardPage() {
  return <AdminDashboardClient />
}