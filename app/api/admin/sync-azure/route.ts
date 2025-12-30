// app/api/admin/sync-azure/route.ts
// DEPRECATED: This endpoint is no longer needed
// The system now uses email-based manager verification instead of Azure AD sync

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    error: 'This endpoint is deprecated',
    message: 'The system now uses email-based manager verification. Azure AD sync is no longer required.',
  }, { status: 410 }); // 410 Gone
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    deprecated: true,
    message: 'Azure AD sync is no longer used. The system uses email-based manager verification.',
  });
}
