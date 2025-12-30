// app/profile/setup/page.tsx
// Profile setup wizard page (shown after first login)

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import ProfileSetupClient from './profile-setup-client';

export default async function ProfileSetupPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/');
  }

  // Check if profile already completed
  const userEmail = session.user.email!;
  const user = await getUserByEmail(userEmail);
  if (user?.profile_completed) {
    redirect('/dashboard');
  }

  return (
    <ProfileSetupClient
      currentUser={{
        name: session.user.name || '',
        email: session.user.email || '',
        department: session.user.department,
        office_location: user?.office_location,
        job_title: user?.job_title,
      }}
    />
  );
}
