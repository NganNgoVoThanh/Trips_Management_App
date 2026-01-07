'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProfileSetupWizardEmail } from '@/components/profile-setup-wizard-email';

interface ProfileSetupClientProps {
  currentUser: {
    name: string;
    email: string;
    department?: string | null;
    office_location?: string | null;
    job_title?: string | null;
  };
}

export default function ProfileSetupClient({ currentUser }: ProfileSetupClientProps) {
  const router = useRouter();
  const { update } = useSession();

  const handleComplete = async (data: {
    department: string;
    office_location: string;
    employee_id?: string;
    manager_email: string;
    phone: string;
    pickup_address: string;
    pickup_notes?: string;
  }) => {
    const response = await fetch('/api/profile/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save profile');
    }

    const result = await response.json();

    // Force session update to get new role from database
    console.log('🔄 Updating session...');
    await update();

    // Wait a bit for JWT callback to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get fresh session after update
    const response2 = await fetch('/api/auth/session');
    const freshSession = await response2.json();

    console.log('📋 Fresh session:', {
      role: freshSession?.user?.role,
      adminType: freshSession?.user?.adminType,
      email: freshSession?.user?.email,
    });

    // Show success message
    if (result.pendingManagerConfirmation) {
      alert(
        '✅ Profile saved!\n\n' +
        'A confirmation email has been sent to your manager.\n' +
        'You can browse the system, but trip submission will be enabled after manager confirms.'
      );
    } else if (result.isAdmin) {
      alert('✅ Profile setup completed!\n\nYou have been assigned as an admin.');
    } else {
      alert('✅ Profile setup completed!');
    }

    // Redirect to appropriate dashboard based on NEW role
    const targetPath = freshSession?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
    console.log(`🔄 Redirecting to ${targetPath} with role: ${freshSession?.user?.role}`);

    router.push(targetPath);
    router.refresh();
  };

  return <ProfileSetupWizardEmail currentUser={currentUser} onComplete={handleComplete} />;
}
