// app/dashboard/page.tsx
import type { Metadata } from "next"
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "User Dashboard | Trips Management",
  description: "Register and manage your business trips",
}

export default async function UserDashboardPage() {
  // Check if user needs to complete profile setup
  const session = await getServerSession(authOptions);
  let pendingManagerConfirmation = false;
  let pendingManagerEmail = '';

  if (session?.user?.email) {
    const user = await getUserByEmail(session.user.email!);

    // Redirect to profile setup if not completed
    if (!user?.profile_completed) {
      redirect('/profile/setup');
    }

    // Check if manager confirmation is pending
    if (user?.pending_manager_email && !user?.manager_confirmed) {
      pendingManagerConfirmation = true;
      pendingManagerEmail = user.pending_manager_email;
    }
  }

  return (
    <DashboardClient
      pendingManagerConfirmation={pendingManagerConfirmation}
      pendingManagerEmail={pendingManagerEmail}
    />
  );
}
