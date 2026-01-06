// app/api/admin/manage/admins/revoke/route.ts
// API endpoint to revoke admin role
// Only accessible by super_admin

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { revokeAdminRole } from '@/lib/admin-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.user.adminType !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only super_admin can revoke admin roles' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { targetUserEmail, reason } = body;

    // Validate required fields
    if (!targetUserEmail) {
      return NextResponse.json(
        { error: 'Missing required field: targetUserEmail' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Revoke admin role
    const result = await revokeAdminRole({
      targetUserEmail,
      performedByEmail: session.user.email!,
      reason: reason || `Revoked by ${session.user.name || session.user.email}`,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error: any) {
    console.error('❌ Error revoking admin role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
