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

    console.log('=== POST /api/admin/manage/admins ===');
    console.log('Session user:', session?.user?.email);
    console.log('Session role:', session?.user?.role);
    console.log('Session adminType:', session?.user?.adminType);

    if (!session?.user?.email) {
      console.log('❌ No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can grant admin roles
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      console.log(`❌ Access denied: role=${session.user.role}, adminType=${session.user.adminType}`);
      return NextResponse.json({
        error: 'Forbidden - Super Admin access required',
        debug: {
          role: session.user.role,
          adminType: session.user.adminType,
          hint: 'Please sign out and sign in again to refresh your session'
        }
      }, { status: 403 });
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
      performedByName: session.user.name || undefined,
      reason,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // If pending assignment was created, send invitation email
    if (result.isPending) {
      try {
        const { emailService } = await import('@/lib/email-service');
        const { markInvitationSent, getAllPendingAssignments } = await import('@/lib/admin-service');

        // Get pending assignment details
        const pendingAssignments = await getAllPendingAssignments({ includeExpired: false });
        const pending = pendingAssignments.find(p => p.email === targetUserEmail);

        if (pending) {
          const adminTypeLabel = adminType === 'super_admin' ? 'Super Admin' : 'Location Admin';
          const locationInfo = pending.location_name ? ` for ${pending.location_name}` : '';

          const subject = `🎉 You've been assigned as ${adminTypeLabel}`;

          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      🎉 Admin Role Assignment
    </h1>
  </div>

  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Hello,</p>

    <p>You have been assigned as <strong>${adminTypeLabel}</strong>${locationInfo} for the Trips Management System.</p>

    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151;">Assignment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Role:</td>
          <td style="padding: 8px 0; font-weight: 500;">${adminTypeLabel}</td>
        </tr>
        ${pending.location_name ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Location:</td>
          <td style="padding: 8px 0; font-weight: 500;">${pending.location_name}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Assigned By:</td>
          <td style="padding: 8px 0; font-weight: 500;">${session.user.name || session.user.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Valid Until:</td>
          <td style="padding: 8px 0; font-weight: 500;">${new Date(pending.expires_at).toLocaleDateString()}</td>
        </tr>
      </table>
    </div>

    ${reason ? `
    <div style="background: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 8px;">
      <p style="margin: 0;"><strong>Note:</strong> ${reason}</p>
    </div>
    ` : ''}

    <div style="background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 10px 0;"><strong>Action Required:</strong></p>
      <p style="margin: 0;">Please login to the system to activate your admin permissions. Once you login, your admin role will be automatically activated.</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}"
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Login Now
      </a>
    </div>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
      If you have any questions, please contact the Admin team.
    </p>
  </div>

  <div style="background: #1f2937; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      Intersnack Trips Management System
    </p>
  </div>
</body>
</html>
          `;

          await emailService.sendEmail({
            to: targetUserEmail,
            subject,
            html,
            text: `You have been assigned as ${adminTypeLabel}${locationInfo}. Please login to activate your admin permissions.`,
          });

          // Mark invitation as sent
          await markInvitationSent(targetUserEmail);

          console.log(`✅ Sent invitation email to ${targetUserEmail}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send invitation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      isPending: result.isPending || false,
    });
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
