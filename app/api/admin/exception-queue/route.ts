// app/api/admin/exception-queue/route.ts
// Admin endpoint to get trips requiring exception handling

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

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
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const connection = await getConnection();

    // Get trips requiring exception handling
    const [trips] = await connection.query<any[]>(
      `SELECT
        t.id,
        t.user_id,
        t.user_name,
        t.user_email,
        t.departure_location,
        t.destination,
        t.departure_date,
        t.departure_time,
        t.return_date,
        t.return_time,
        t.purpose,
        t.status,
        t.manager_approval_status,
        t.is_urgent,
        t.auto_approved,
        t.cc_emails,
        t.created_at,
        u.manager_email,
        u.manager_name,
        TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_since_created
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE
        (
          -- Expired tokens (> 48 hours old and still pending)
          (t.manager_approval_status = 'pending' AND TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 48)
          OR
          -- Urgent trips (< 24h until departure)
          (t.is_urgent = 1 AND t.manager_approval_status = 'pending')
          OR
          -- Auto-approved trips (for audit)
          (t.auto_approved = 1)
          OR
          -- No manager trips
          (t.manager_approval_status IS NULL AND t.auto_approved = 0)
        )
      ORDER BY
        CASE
          WHEN t.is_urgent = 1 THEN 1
          WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 48 THEN 2
          WHEN t.auto_approved = 1 THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT 100`
    );

    // Categorize exceptions
    const exceptions = {
      urgent: [] as any[],
      expired: [] as any[],
      autoApproved: [] as any[],
      noManager: [] as any[],
    };

    trips.forEach(trip => {
      // Parse cc_emails if JSON string
      if (trip.cc_emails && typeof trip.cc_emails === 'string') {
        try {
          trip.cc_emails = JSON.parse(trip.cc_emails);
        } catch {
          trip.cc_emails = [];
        }
      }

      if (trip.is_urgent && trip.manager_approval_status === 'pending') {
        exceptions.urgent.push(trip);
      }

      if (trip.manager_approval_status === 'pending' && trip.hours_since_created > 48) {
        exceptions.expired.push(trip);
      }

      if (trip.auto_approved) {
        exceptions.autoApproved.push(trip);
      }

      if (!trip.manager_email && !trip.auto_approved) {
        exceptions.noManager.push(trip);
      }
    });

    await connection.end();

    return NextResponse.json({
      success: true,
      exceptions,
      summary: {
        total: trips.length,
        urgent: exceptions.urgent.length,
        expired: exceptions.expired.length,
        autoApproved: exceptions.autoApproved.length,
        noManager: exceptions.noManager.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching exception queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch exception queue',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST endpoint to manually approve/reject trips from exception queue
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { tripId, action, notes } = await request.json();

    if (!tripId || !action) {
      return NextResponse.json(
        { error: 'Missing tripId or action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    const connection = await getConnection();

    // Get trip details
    const [trips] = await connection.query<any[]>(
      `SELECT t.*, u.email as user_email, u.name as user_name
       FROM trips t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?
       LIMIT 1`,
      [tripId]
    );

    if (trips.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const trip = trips[0];

    // Update trip status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const adminEmail = session.user.email || 'admin';

    await connection.query(
      `UPDATE trips
       SET manager_approval_status = ?,
           status = ?,
           manager_approval_at = NOW(),
           manager_approved_by = ?
       WHERE id = ?`,
      [newStatus, newStatus, `${adminEmail} (Admin Override)`, tripId]
    );

    // TODO: Send confirmation email to user
    console.log(`✅ Admin ${action}d trip ${tripId}`);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: `Trip ${action}d successfully by admin`,
      tripId,
      action,
    });
  } catch (error: any) {
    console.error('❌ Error processing admin action:', error);
    return NextResponse.json(
      {
        error: 'Failed to process action',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
