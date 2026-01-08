// app/api/trips/approve/route.ts
// Handle trip approval/rejection via email link

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyApprovalToken, sendConfirmationEmail } from '@/lib/email-approval-service';
import { logApprovalAction } from '@/lib/audit-log-service';
import {
  sendExpiredLinkNotificationToUser,
  sendExpiredLinkNotificationToAdmin,
  calculateExpiredHours,
} from '@/lib/expired-approval-notification';
import { TripStatus } from '@/lib/trip-status-config';
import { checkOptimizationPotential } from '@/lib/optimization-helper';

// Database connection
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invalid Request</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Invalid Request</h1>
          <p>Missing approval token.</p>
        </div>
      </body>
      </html>
      `,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Verify token
  const decoded = verifyApprovalToken(token);

  if (!decoded) {
    // ✅ REAL-TIME NOTIFICATION: Token expired, send notifications to user and admin
    const connection = await getConnection();

    try {
      // Extract tripId from token (even if expired, we can still decode the payload)
      const jwt = require('jsonwebtoken');
      const decodedPayload = jwt.decode(token) as any;

      if (decodedPayload && decodedPayload.tripId) {
        // Get trip details
        const [trips] = await connection.query(
          `SELECT
            t.id, t.created_at, t.departure_location, t.destination,
            t.departure_date, t.departure_time, t.return_date, t.return_time,
            t.purpose, t.expired_notification_sent,
            u.email as user_email, u.name as user_name, u.manager_email, u.manager_name
          FROM trips t
          JOIN users u ON t.user_id = u.id
          WHERE t.id = ? AND t.manager_approval_status = 'pending'
          LIMIT 1`,
          [decodedPayload.tripId]
        ) as any[];

        if (trips.length > 0 && !trips[0].expired_notification_sent) {
          const trip = trips[0];
          const expiredHours = calculateExpiredHours(trip.created_at);

          // Send notification to user
          await sendExpiredLinkNotificationToUser({
            tripId: trip.id,
            userEmail: trip.user_email,
            userName: trip.user_name,
            managerEmail: trip.manager_email || decodedPayload.managerEmail,
            managerName: trip.manager_name || 'Manager',
            tripDetails: {
              departureLocation: trip.departure_location,
              destination: trip.destination,
              departureDate: trip.departure_date,
              departureTime: trip.departure_time,
              returnDate: trip.return_date,
              returnTime: trip.return_time,
              purpose: trip.purpose,
            },
            expiredHours,
          });

          // Send notification to admin
          await sendExpiredLinkNotificationToAdmin({
            tripId: trip.id,
            userEmail: trip.user_email,
            userName: trip.user_name,
            managerEmail: trip.manager_email || decodedPayload.managerEmail,
            managerName: trip.manager_name || 'Manager',
            tripDetails: {
              departureLocation: trip.departure_location,
              destination: trip.destination,
              departureDate: trip.departure_date,
              departureTime: trip.departure_time,
              returnDate: trip.return_date,
              returnTime: trip.return_time,
              purpose: trip.purpose,
            },
            expiredHours,
          });

          // Mark as notified
          await connection.query(
            `UPDATE trips SET expired_notification_sent = TRUE, expired_notified_at = NOW() WHERE id = ?`,
            [trip.id]
          );

          console.log(`✅ Sent expired link notifications for trip ${trip.id}`);
        }
      }
    } catch (notificationError) {
      console.error('❌ Failed to send expired notifications:', notificationError);
    } finally {
      await connection.end();
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Token Expired</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .warning { background: #fff3cd; border: 2px solid #ffc107; padding: 30px; border-radius: 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="warning">
          <h1>⏰ Link Đã Hết Hạn</h1>
          <p>Link phê duyệt đã hết hạn (>48 giờ).</p>
          <p><strong>Chúng tôi đã gửi thông báo cho nhân viên và Admin.</strong></p>
          <p>Admin sẽ xử lý yêu cầu này trong thời gian sớm nhất.</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:50001'}/admin/manual-override" class="button">
            Go to Admin Manual Override
          </a>
        </div>
      </body>
      </html>
      `,
      { status: 410, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const { tripId, managerEmail, action } = decoded;

  // Process approval
  const connection = await getConnection();

  try {
    // Get trip details
    const [trips] = await connection.query<any[]>(
      `SELECT
        t.id, t.user_id, t.departure_location, t.destination,
        t.departure_date, t.departure_time, t.return_date, t.return_time,
        t.purpose, t.manager_approval_status,
        u.email as user_email, u.name as user_name
      FROM trips t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
      LIMIT 1`,
      [tripId]
    );

    if (trips.length === 0) {
      await connection.end();
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Not Found</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>❌ Trip Does Not Exist</h1>
        </body>
        </html>
        `,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const trip = trips[0];

    // Check if already processed
    if (trip.manager_approval_status !== 'pending') {
      await connection.end();
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Already Processed</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .info { background: #d1ecf1; border: 2px solid #0c5460; padding: 30px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="info">
            <h1>ℹ️ Already Processed</h1>
            <p>This request was already processed before.</p>
            <p>Current Status: <strong>${trip.manager_approval_status}</strong></p>
          </div>
        </body>
        </html>
        `,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Determine new status based on action
    let tripStatus: TripStatus;
    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    const approvedAt = action === 'approve' ? new Date() : null;

    if (action === 'approve') {
      // Check if trip can be optimized with other similar trips
      // First update manager approval status
      await connection.query(
        `UPDATE trips
         SET manager_approval_status = ?,
             manager_approval_at = ?,
             manager_approved_by = ?
         WHERE id = ?`,
        [approvalStatus, approvedAt, managerEmail, tripId]
      );

      // Check optimization potential
      const canOptimize = await checkOptimizationPotential(tripId);

      // Set appropriate status
      tripStatus = canOptimize ? 'approved' : 'approved_solo';

      console.log(`✓ Trip ${tripId} can optimize: ${canOptimize} → status: ${tripStatus}`);
    } else {
      // Rejected by manager
      tripStatus = 'rejected';
    }

    // Update trip status AND mark as notified (email will be sent below)
    await connection.query(
      `UPDATE trips
       SET status = ?,
           notified = TRUE
       WHERE id = ?`,
      [tripStatus, tripId]
    );

    // Log to audit trail
    await logApprovalAction({
      tripId,
      action: action === 'approve' ? 'approve' : 'reject',
      actorEmail: managerEmail,
      actorRole: 'manager',
      oldStatus: 'pending_approval',
      newStatus: tripStatus,
      notes: action === 'approve'
        ? `Manager approved via email link. Status: ${tripStatus} (${tripStatus === 'approved' ? 'can be optimized' : 'solo trip'})`
        : 'Manager rejected via email link',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Send confirmation email to user
    await sendConfirmationEmail({
      userEmail: trip.user_email,
      userName: trip.user_name,
      tripDetails: {
        departureLocation: trip.departure_location,
        destination: trip.destination,
        departureDate: trip.departure_date,
        departureTime: trip.departure_time,
        returnDate: trip.return_date,
        returnTime: trip.return_time,
      },
      status: action === 'approve' ? 'approved' : 'rejected',
      managerName: managerEmail.split('@')[0],
    });

    console.log(`✅ Trip ${tripId} status: ${tripStatus} by ${managerEmail}`);

    await connection.end();

    // Success page
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${action === 'approve' ? 'Approved' : 'Rejected'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .success {
            background: ${action === 'approve' ? '#d4edda' : '#f8d7da'};
            border: 2px solid ${action === 'approve' ? '#28a745' : '#dc3545'};
            padding: 40px;
            border-radius: 12px;
          }
          h1 { color: ${action === 'approve' ? '#28a745' : '#dc3545'}; font-size: 32px; margin-bottom: 20px; }
          .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: ${action === 'approve' ? '#28a745' : '#dc3545'};
            color: white;
            font-size: 48px;
            line-height: 80px;
            margin: 0 auto 20px;
          }
          .details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 24px;
            text-align: left;
          }
          .details h3 { margin-top: 0; color: #333; }
          .details p { margin: 8px 0; color: #666; }
          .details strong { color: #333; }
        </style>
      </head>
      <body>
        <div class="success">
          <div class="checkmark">${action === 'approve' ? '✓' : '✗'}</div>
          <h1>${action === 'approve' ? 'Approved' : 'Rejected'}</h1>
          <p style="font-size: 18px; margin: 16px 0;">
            Business trip request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.
          </p>

          <div class="details">
            <h3>Trip Details</h3>
            <p><strong>Registered Person:</strong> ${trip.user_name}</p>
            <p><strong>From:</strong> ${trip.departure_location}</p>
            <p><strong>To:</strong> ${trip.destination}</p>
            <p><strong>Departure:</strong> ${trip.departure_date} ${trip.departure_time}</p>
            <p><strong>Return:</strong> ${trip.return_date} ${trip.return_time}</p>
            ${trip.purpose ? `<p><strong>Purpose:</strong> ${trip.purpose}</p>` : ''}
          </div>

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Confirmation email sent to ${trip.user_name}.
          </p>
        </div>
      </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('❌ Error processing approval:', error);
    await connection.end();

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Error</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <div style="background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px;">
          <h1>❌ An Error Occurred</h1>
          <p>Please contact Admin for handling.</p>
          <p style="font-size: 12px; color: #666;">${error.message}</p>
        </div>
      </body>
      </html>
      `,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
