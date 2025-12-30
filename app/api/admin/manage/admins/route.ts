// app/api/admin/manage/admins/route.ts
// API endpoints for admin management (Super Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  getAllAdmins,
  grantAdminRole,
  revokeAdminRole,
  searchUsersForAdminAssignment,
} from '@/lib/admin-service';

export const dynamic = 'force-dynamic';

// ========================================
// GET - List all admins
// ========================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can access this endpoint
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Search users for admin assignment
    if (action === 'search') {
      const query = searchParams.get('query') || '';
      const excludeAdmins = searchParams.get('excludeAdmins') === 'true';

      if (query.length < 2) {
        return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
      }

      const users = await searchUsersForAdminAssignment({
        query,
        excludeCurrentAdmins: excludeAdmins,
        limit: 20,
      });

      return NextResponse.json({ users });
    }

    // Default: Get all admins
    const admins = await getAllAdmins();

    return NextResponse.json({ admins });
  } catch (error: any) {
    console.error('Error in GET /api/admin/manage/admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ========================================
// POST - Grant admin role
// ========================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can grant admin roles
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserEmail, adminType, locationId, reason } = body;

    // Validation
    if (!targetUserEmail) {
      return NextResponse.json({ error: 'Target user email is required' }, { status: 400 });
    }

    if (!adminType || !['super_admin', 'location_admin'].includes(adminType)) {
      return NextResponse.json({ error: 'Invalid admin type' }, { status: 400 });
    }

    if (adminType === 'location_admin' && !locationId) {
      return NextResponse.json({ error: 'Location ID is required for location admin' }, { status: 400 });
    }

    // Get IP and User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await grantAdminRole({
      targetUserEmail,
      adminType,
      locationId: adminType === 'location_admin' ? locationId : null,
      performedByEmail: session.user.email,
      reason,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in POST /api/admin/manage/admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ========================================
// DELETE - Revoke admin role
// ========================================
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can revoke admin roles
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserEmail = searchParams.get('email');
    const reason = searchParams.get('reason') || undefined;

    if (!targetUserEmail) {
      return NextResponse.json({ error: 'Target user email is required' }, { status: 400 });
    }

    // Get IP and User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await revokeAdminRole({
      targetUserEmail,
      performedByEmail: session.user.email,
      reason,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/manage/admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
