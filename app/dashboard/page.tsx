// app/dashboard/page.tsx
import type { Metadata } from "next"
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "User Dashboard | Trips Management",
  description: "Register and manage your business trips",
}

export default function UserDashboardPage() {
  return <DashboardClient />
}
