'use client';

import { useRouter } from 'next/navigation';
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

    // Show success message
    if (result.pendingManagerConfirmation) {
      alert(
        '✅ Profile saved!\n\n' +
        'A confirmation email has been sent to your manager.\n' +
        'You can browse the system, but trip submission will be enabled after manager confirms.'
      );
    } else {
      alert('✅ Profile setup completed!');
    }

    // Redirect to dashboard
    router.push('/dashboard');
    router.refresh();
  };

  return <ProfileSetupWizardEmail currentUser={currentUser} onComplete={handleComplete} />;
}
