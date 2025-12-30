// app/admin/exception-queue/page.tsx
// Admin dashboard for handling exception cases

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import ExceptionQueueClient from './exception-queue-client';

export default async function ExceptionQueuePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <ExceptionQueueClient />;
}
