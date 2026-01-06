// app/api/admin/manage/admins/grant/route.ts
// API endpoint to grant admin role
// Only accessible by super_admin

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { grantAdminRole } from '@/lib/admin-service';

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
        { error: 'Forbidden - Only super_admin can grant admin roles' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { targetUserEmail, adminType, locationId, reason } = body;

    // Validate required fields
    if (!targetUserEmail || !adminType) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUserEmail, adminType' },
        { status: 400 }
      );
    }

    // Validate admin type
    if (!['super_admin', 'location_admin'].includes(adminType)) {
      return NextResponse.json(
        { error: 'Invalid adminType. Must be super_admin or location_admin' },
        { status: 400 }
      );
    }

    // Validate location for location_admin
    if (adminType === 'location_admin' && !locationId) {
      return NextResponse.json(
        { error: 'locationId is required for location_admin' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Grant admin role
    const result = await grantAdminRole({
      targetUserEmail,
      adminType,
      locationId: locationId || null,
      performedByEmail: session.user.email!,
      reason: reason || `Granted by ${session.user.name || session.user.email}`,
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
    console.error('❌ Error granting admin role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
