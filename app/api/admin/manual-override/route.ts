// app/api/admin/manual-override/route.ts
// Admin Manual Override API for expired approval links

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

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

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    try {
      // Get trips with pending manager approval that are >48h old
      const [trips] = await connection.query(`
        SELECT
          t.id,
          t.user_name,
          t.user_email,
          t.departure_location,
          t.destination,
          t.departure_date,
          t.departure_time,
          t.return_date,
          t.return_time,
          t.purpose,
          t.estimated_cost,
          t.vehicle_type,
          t.created_at,
          t.manager_approval_status,
          t.expired_notification_sent,
          t.expired_notified_at,
          u.manager_email,
          u.manager_name,
          TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_old
        FROM trips t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.manager_approval_status = 'pending'
          AND TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 48
        ORDER BY t.created_at ASC
      `) as any[];

      // Get statistics
      const [stats] = await connection.query(`
        SELECT
          COUNT(*) as total_expired,
          SUM(CASE WHEN expired_notification_sent = TRUE THEN 1 ELSE 0 END) as notified_count,
          SUM(CASE WHEN expired_notification_sent = FALSE OR expired_notification_sent IS NULL THEN 1 ELSE 0 END) as pending_notification_count
        FROM trips
        WHERE manager_approval_status = 'pending'
          AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 48
      `) as any[];

      await connection.end();

      return NextResponse.json({
        success: true,
        trips: trips || [],
        statistics: stats[0] || { total_expired: 0, notified_count: 0, pending_notification_count: 0 },
      });
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('❌ Error fetching manual override trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips', details: error.message },
      { status: 500 }
    );
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

  try {
    const body = await request.json();
    const { tripId, action, reason } = body;

    // Validate input
    if (!tripId || !action || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId, action, reason' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    try {
      await connection.beginTransaction();

      // Get trip details
      const [trips] = await connection.query(
        `SELECT
          t.*,
          u.email as user_email,
          u.name as user_name,
          u.manager_email,
          u.manager_name
        FROM trips t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
        LIMIT 1`,
        [tripId]
      ) as any[];

      if (!trips || trips.length === 0) {
        await connection.rollback();
        await connection.end();
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        );
      }

      const trip = trips[0];

      // Check if trip is in pending status
      if (trip.manager_approval_status !== 'pending') {
        await connection.rollback();
        await connection.end();
        return NextResponse.json(
          { error: `Trip is already ${trip.manager_approval_status}` },
          { status: 400 }
        );
      }

      // Update trip status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const approvedAt = action === 'approve' ? new Date() : null;

      await connection.query(
        `UPDATE trips
         SET manager_approval_status = ?,
             manager_approval_at = ?,
             manager_approved_by = ?,
             status = ?
         WHERE id = ?`,
        [newStatus, approvedAt, session.user.email, newStatus, tripId]
      );

      // Log to admin_override_log
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
          manager_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId,
          action,
          session.user.email,
          session.user.name || session.user.email,
          reason,
          'pending',
          newStatus,
          'EXPIRED_APPROVAL_LINK',
          trip.user_email,
          trip.user_name,
          trip.manager_email || null,
        ]
      );

      await connection.commit();

      // Send notification email to user
      try {
        const { emailService } = await import('@/lib/email-service');

        const subject = action === 'approve'
          ? '✅ Your Trip Has Been Approved'
          : '❌ Your Trip Has Been Rejected';

        const html = `
          <h2>${action === 'approve' ? '✅ Your Trip Has Been Approved' : '❌ Your Trip Has Been Rejected'}</h2>
          <p>Hello <strong>${trip.user_name}</strong>,</p>

          <p>Your trip has been manually processed by Admin:</p>

          <div style="background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px;">
            <h3>Trip Details:</h3>
            <p><strong>From:</strong> ${trip.departure_location}</p>
            <p><strong>To:</strong> ${trip.destination}</p>
            <p><strong>Departure:</strong> ${trip.departure_date} at ${trip.departure_time}</p>
            <p><strong>Return:</strong> ${trip.return_date} at ${trip.return_time}</p>
            <p><strong>Trip ID:</strong> <code>${tripId}</code></p>
          </div>

          <div style="background: ${action === 'approve' ? '#d4edda' : '#f8d7da'}; padding: 15px; margin: 15px 0; border-radius: 8px;">
            <p><strong>Status:</strong> ${action === 'approve' ? 'Approved' : 'Rejected'}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Processed by:</strong> ${session.user.name || session.user.email}</p>
          </div>

          <p>Best regards,<br/>Intersnack Trips Management Team</p>
        `;

        await emailService.sendEmail({
          to: trip.user_email,
          subject,
          html,
          text: `Your trip has been ${action === 'approve' ? 'approved' : 'rejected'} by Admin. Reason: ${reason}`,
        });

        console.log(`✅ Sent ${action} notification to user: ${trip.user_email}`);
      } catch (emailError) {
        console.error('❌ Failed to send notification email:', emailError);
        // Don't fail the override if email fails
      }

      // If approved, trigger AI optimization
      if (action === 'approve') {
        try {
          const { aiOptimizer } = await import('@/lib/ai-optimizer');

          const [approvedTrips] = await connection.query(
            `SELECT * FROM trips
             WHERE manager_approval_status = 'approved'
               AND status = 'approved'
               AND departure_date >= CURDATE()
             ORDER BY departure_date ASC, departure_time ASC
             LIMIT 100`
          ) as any[];

          if (approvedTrips.length >= 2) {
            console.log('🤖 Triggering AI optimization after manual approval...');
            const proposals = await aiOptimizer.optimizeTrips(approvedTrips);
            console.log(`✅ Generated ${proposals.length} optimization proposals`);
          }
        } catch (optimizationError) {
          console.error('❌ Auto-optimization failed (non-critical):', optimizationError);
        }
      }

      await connection.end();

      return NextResponse.json({
        success: true,
        message: `Trip ${action}d successfully`,
        tripId,
        newStatus,
      });
    } catch (error) {
      await connection.rollback();
      await connection.end();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error processing manual override:', error);
    return NextResponse.json(
      { error: 'Failed to process override', details: error.message },
      { status: 500 }
    );
  }
}
