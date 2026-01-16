// app/api/admin/manual-override/route.ts
// Admin Manual Override API for expired approval links

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { ensureTripsColumns, ensureAuditTables } from '@/lib/database-migration';

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

// Helper to get User Agent from request
function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// GET: Fetch trips pending manual override
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and admin role
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get trips with pending manager approval that are >48h old
    // Exclude cancelled trips and trips where departure has already passed
    const [trips] = await connection.query(`
      SELECT
        t.id,
        t.user_name,
        t.user_email,
        t.user_id,
        t.departure_location,
        t.destination,
        t.departure_date,
        t.departure_time,
        t.return_date,
        t.return_time,
        t.purpose,
        t.estimated_cost,
        t.vehicle_type,
        t.status,
        t.created_at,
        t.manager_approval_status,
        t.expired_notification_sent,
        t.expired_notified_at,
        u.manager_email,
        u.manager_name,
        u.status as user_status,
        TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_old,
        CASE
          WHEN t.departure_date < CURDATE() THEN TRUE
          WHEN t.departure_date = CURDATE() AND t.departure_time < CURTIME() THEN TRUE
          ELSE FALSE
        END as is_past_departure
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.manager_approval_status = 'pending'
        AND t.status NOT IN ('cancelled', 'rejected', 'expired')
        AND TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 48
      ORDER BY t.departure_date ASC, t.departure_time ASC
    `) as any[];

    // Get statistics
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_expired,
        SUM(CASE WHEN expired_notification_sent = TRUE THEN 1 ELSE 0 END) as notified_count,
        SUM(CASE WHEN expired_notification_sent = FALSE OR expired_notification_sent IS NULL THEN 1 ELSE 0 END) as pending_notification_count,
        SUM(CASE WHEN departure_date < CURDATE() THEN 1 ELSE 0 END) as past_departure_count
      FROM trips
      WHERE manager_approval_status = 'pending'
        AND status NOT IN ('cancelled', 'rejected', 'expired')
        AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 48
    `) as any[];

    // Get recent override history (last 20)
    const [overrideHistory] = await connection.query(`
      SELECT
        aol.id,
        aol.trip_id,
        aol.action_type,
        aol.admin_email,
        aol.admin_name,
        aol.reason,
        aol.original_status,
        aol.new_status,
        aol.user_email,
        aol.user_name,
        aol.created_at
      FROM admin_override_log aol
      ORDER BY aol.created_at DESC
      LIMIT 20
    `) as any[];

    return NextResponse.json({
      success: true,
      trips: trips || [],
      statistics: stats[0] || {
        total_expired: 0,
        notified_count: 0,
        pending_notification_count: 0,
        past_departure_count: 0
      },
      overrideHistory: overrideHistory || [],
    });
  } catch (error: any) {
    console.error('❌ Error fetching manual override trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST: Process manual override (approve/reject)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and admin role
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    const body = await request.json();
    const { tripId, action, reason, forceOverride } = body;

    // Validate input
    if (!tripId) {
      return NextResponse.json(
        { error: 'Missing required field: tripId' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Reason is required and must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Ensure required tables and columns exist
    await ensureTripsColumns();
    await ensureAuditTables();

    // Get client info for audit
    const clientIP = getClientIP(request);
    const userAgent = getUserAgent(request);

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await connection.beginTransaction();

    try {
      // Get trip details with FOR UPDATE lock to prevent concurrent modification
      const [trips] = await connection.query(
        `SELECT
          t.*,
          u.email as user_email_from_user,
          u.name as user_name_from_user,
          u.manager_email,
          u.manager_name,
          u.status as user_status,
          CASE
            WHEN t.departure_date < CURDATE() THEN TRUE
            WHEN t.departure_date = CURDATE() AND t.departure_time < CURTIME() THEN TRUE
            ELSE FALSE
          END as is_past_departure
        FROM trips t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
        FOR UPDATE`,
        [tripId]
      ) as any[];

      if (!trips || trips.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        );
      }

      const trip = trips[0];
      const userEmail = trip.user_email || trip.user_email_from_user;
      const userName = trip.user_name || trip.user_name_from_user;

      // === EXCEPTION HANDLING ===

      // 1. Check if trip is already processed
      if (trip.manager_approval_status !== 'pending') {
        await connection.rollback();
        return NextResponse.json(
          {
            error: 'Trip already processed',
            details: `This trip has already been ${trip.manager_approval_status}. Cannot override.`,
            currentStatus: trip.manager_approval_status
          },
          { status: 409 } // Conflict
        );
      }

      // 2. Check if trip status is not valid for override
      if (['cancelled', 'rejected', 'expired'].includes(trip.status)) {
        await connection.rollback();
        return NextResponse.json(
          {
            error: 'Trip cannot be overridden',
            details: `This trip has been ${trip.status} and cannot be processed.`,
            currentStatus: trip.status
          },
          { status: 400 }
        );
      }

      // 3. Check if departure date has already passed (warning, allow force)
      if (trip.is_past_departure && action === 'approve' && !forceOverride) {
        await connection.rollback();
        return NextResponse.json(
          {
            error: 'Departure date has passed',
            details: `The departure date (${trip.departure_date} ${trip.departure_time}) has already passed. Are you sure you want to approve this trip?`,
            requiresForce: true,
            tripId: tripId
          },
          { status: 422 } // Unprocessable Entity
        );
      }

      // 4. Check if user is still active
      if (trip.user_status === 'inactive' || trip.user_status === 'disabled') {
        await connection.rollback();
        return NextResponse.json(
          {
            error: 'User account is inactive',
            details: `The user (${userName}) is currently ${trip.user_status}. Please check with HR before processing.`,
            userStatus: trip.user_status
          },
          { status: 400 }
        );
      }

      // === PROCESS OVERRIDE ===

      // Update trip status
      const managerApprovalStatus = action === 'approve' ? 'approved' : 'rejected';
      const tripStatus = action === 'approve' ? 'approved_solo' : 'rejected';
      const approvedAt = new Date();

      await connection.query(
        `UPDATE trips
         SET manager_approval_status = ?,
             manager_approval_at = ?,
             manager_approved_by = ?,
             status = ?,
             notified = TRUE,
             updated_at = NOW()
         WHERE id = ?`,
        [managerApprovalStatus, approvedAt, session.user.email, tripStatus, tripId]
      );

      // Log to admin_override_log with full details
      await connection.query(
        `INSERT INTO admin_override_log (
          trip_id,
          action_type,
          admin_email,
          admin_name,
          reason,
          original_status,
          new_status,
          override_reason,
          user_email,
          user_name,
          manager_email,
          ip_address,
          user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId,
          action,
          session.user.email,
          session.user.name || session.user.email,
          reason.trim(),
          trip.status || 'pending_approval',
          tripStatus,
          forceOverride ? 'FORCE_OVERRIDE_PAST_DEPARTURE' : 'EXPIRED_APPROVAL_LINK',
          userEmail,
          userName,
          trip.manager_email || null,
          clientIP,
          userAgent
        ]
      );

      await connection.commit();

      // Send notification email to user (non-blocking)
      try {
        const { emailService } = await import('@/lib/email-service');

        const subject = action === 'approve'
          ? '✅ Your Trip Has Been Approved'
          : '❌ Your Trip Has Been Rejected';

        const statusColor = action === 'approve' ? '#10b981' : '#ef4444';
        const statusBg = action === 'approve' ? '#d1fae5' : '#fee2e2';

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${statusColor}, ${action === 'approve' ? '#059669' : '#dc2626'}); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      ${action === 'approve' ? '✅' : '❌'} Trip ${action === 'approve' ? 'Approved' : 'Rejected'}
    </h1>
  </div>

  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Hello <strong>${userName}</strong>,</p>

    <p>Your trip request has been manually processed by an Administrator due to the approval link expiring.</p>

    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151;">Trip Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">From:</td>
          <td style="padding: 8px 0; font-weight: 500;">${trip.departure_location}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">To:</td>
          <td style="padding: 8px 0; font-weight: 500;">${trip.destination}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Departure:</td>
          <td style="padding: 8px 0; font-weight: 500;">${trip.departure_date} at ${trip.departure_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Return:</td>
          <td style="padding: 8px 0; font-weight: 500;">${trip.return_date} at ${trip.return_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Trip ID:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${tripId}</td>
        </tr>
      </table>
    </div>

    <div style="background: ${statusBg}; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid ${statusColor};">
      <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${action === 'approve' ? 'Approved' : 'Rejected'}</p>
      <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${reason}</p>
      <p style="margin: 0;"><strong>Processed by:</strong> ${session.user.name || session.user.email}</p>
    </div>

    ${action === 'approve' ? `
    <div style="background: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 8px;">
      <p style="margin: 0; color: #1e40af;">
        <strong>Note:</strong> As this trip was approved via manual override, it has been marked as "Solo Approved" and will not be included in route optimization.
      </p>
    </div>
    ` : ''}

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
          to: userEmail,
          subject,
          html,
          text: `Your trip has been ${action === 'approve' ? 'approved' : 'rejected'} by Admin. Reason: ${reason}`,
        });

        console.log(`✅ Sent ${action} notification to user: ${userEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send notification email:', emailError);
        // Don't fail the override if email fails
      }

      return NextResponse.json({
        success: true,
        message: `Trip ${action}d successfully`,
        tripId,
        newStatus: tripStatus,
        processedBy: session.user.email,
        processedAt: approvedAt.toISOString(),
        wasForced: forceOverride || false,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error processing manual override:', error);
    return NextResponse.json(
      { error: 'Failed to process override', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// GET: Fetch override history (separate endpoint for pagination)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [history] = await connection.query(`
      SELECT
        aol.*,
        t.departure_location,
        t.destination,
        t.departure_date
      FROM admin_override_log aol
      LEFT JOIN trips t ON aol.trip_id = t.id
      ORDER BY aol.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]) as any[];

    const [countResult] = await connection.query(
      'SELECT COUNT(*) as total FROM admin_override_log'
    ) as any[];

    return NextResponse.json({
      success: true,
      history: history || [],
      pagination: {
        page,
        limit,
        total: countResult[0]?.total || 0,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching override history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
