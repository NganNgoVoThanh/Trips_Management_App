// app/api/admin/pending-assignments/route.ts
// API for managing pending admin assignments

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { runDatabaseMigrations } from '@/lib/database-migration';
import {
  getAllPendingAssignments,
  revokePendingAssignment,
  markInvitationSent,
  type PendingAdminAssignment,
} from '@/lib/admin-service';

// Helper to get client IP from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// GET: Fetch all pending admin assignments
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and super admin role
  if (!session?.user || session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Super Admin access required' },
      { status: 401 }
    );
  }

  // Ensure pending_admin_assignments table exists
  try {
    await runDatabaseMigrations();
  } catch (migrationError) {
    console.error('❌ Failed to run migrations:', migrationError);
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const includeActivated = searchParams.get('includeActivated') === 'true';

    const pendingAssignments = await getAllPendingAssignments({
      includeExpired,
      includeActivated,
    });

    // Calculate statistics
    const now = new Date();
    const stats = {
      total: pendingAssignments.length,
      active: pendingAssignments.filter(p => !p.activated && new Date(p.expires_at) > now).length,
      expired: pendingAssignments.filter(p => !p.activated && new Date(p.expires_at) <= now).length,
      activated: pendingAssignments.filter(p => p.activated).length,
      pending_invitation: pendingAssignments.filter(p => !p.invitation_sent && !p.activated).length,
    };

    return NextResponse.json({
      success: true,
      pendingAssignments,
      statistics: stats,
    });
  } catch (error: any) {
    console.error('❌ Error fetching pending assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending assignments', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Revoke pending admin assignment
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and super admin role
  if (!session?.user || session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Super Admin access required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { email, reason } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    const result = await revokePendingAssignment({
      email,
      performedByEmail: session.user.email!,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('❌ Error revoking pending assignment:', error);
    return NextResponse.json(
      { error: 'Failed to revoke pending assignment', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Resend invitation email
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and super admin role
  if (!session?.user || session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Super Admin access required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { email, action } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    if (action === 'resend_invitation') {
      // Get pending assignment details
      const pendingAssignments = await getAllPendingAssignments({ includeExpired: false });
      const pending = pendingAssignments.find(p => p.email === email);

      if (!pending) {
        return NextResponse.json(
          { error: 'Pending assignment not found' },
          { status: 404 }
        );
      }

      // Send invitation email
      const { emailService } = await import('@/lib/email-service');
      const { updateReminderCount } = await import('@/lib/admin-service');

      const adminTypeLabel = pending.admin_type === 'super_admin' ? 'Super Admin' : 'Location Admin';
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
          <td style="padding: 8px 0; font-weight: 500;">${pending.assigned_by_name || pending.assigned_by_email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Valid Until:</td>
          <td style="padding: 8px 0; font-weight: 500;">${new Date(pending.expires_at).toLocaleDateString()}</td>
        </tr>
      </table>
    </div>

    ${pending.reason ? `
    <div style="background: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 8px;">
      <p style="margin: 0;"><strong>Note:</strong> ${pending.reason}</p>
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
        to: email,
        subject,
        html,
        text: `You have been assigned as ${adminTypeLabel}${locationInfo}. Please login to activate your admin permissions.`,
      });

      // Update reminder count
      await updateReminderCount(email);

      console.log(`✅ Resent invitation email to ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Invitation email sent successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation', details: error.message },
      { status: 500 }
    );
  }
}
