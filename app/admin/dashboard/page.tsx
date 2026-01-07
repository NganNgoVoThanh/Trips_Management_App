// app/admin/dashboard/page.tsx
import type { Metadata } from "next"
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import { AdminDashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard | Trips Management",
  description: "Manage and optimize company trips",
}

export default async function AdminDashboardPage() {
  // Check if admin needs to complete profile setup
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const user = await getUserByEmail(session.user.email);

    // Redirect to profile setup if not completed
    if (!user?.profile_completed) {
      redirect('/profile/setup');
    }
  }

  return <AdminDashboardClient />
}
