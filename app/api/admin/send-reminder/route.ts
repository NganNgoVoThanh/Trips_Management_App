// app/api/admin/send-reminder/route.ts
// Admin endpoint to send reminder emails for pending approvals

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { sendApprovalEmail, ApprovalEmailData } from '@/lib/email-approval-service';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

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

    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const connection = await getConnection();

    // Get trip details
    const [trips] = await connection.query<any[]>(
      `SELECT
        t.*,
        u.manager_email,
        u.manager_name
      FROM trips t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ? AND t.manager_approval_status = 'pending'
      LIMIT 1`,
      [tripId]
    );

    if (trips.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Trip not found or not pending approval' },
        { status: 404 }
      );
    }

    const trip = trips[0];

    if (!trip.manager_email) {
      await connection.end();
      return NextResponse.json(
        { error: 'No manager email found for this trip' },
        { status: 400 }
      );
    }

    // Parse cc_emails if JSON string
    let ccEmails: string[] = [];
    if (trip.cc_emails) {
      try {
        ccEmails = typeof trip.cc_emails === 'string' ? JSON.parse(trip.cc_emails) : trip.cc_emails;
      } catch {
        ccEmails = [];
      }
    }

    // Resend approval email
    const emailData: ApprovalEmailData = {
      tripId: trip.id,
      userName: trip.user_name,
      userEmail: trip.user_email,
      managerEmail: trip.manager_email,
      managerName: trip.manager_name,
      ccEmails: ccEmails,
      tripDetails: {
        departureLocation: trip.departure_location,
        destination: trip.destination,
        departureDate: trip.departure_date,
        departureTime: trip.departure_time,
        returnDate: trip.return_date,
        returnTime: trip.return_time,
        purpose: trip.purpose,
      },
      isUrgent: trip.is_urgent || false,
    };

    const sent = await sendApprovalEmail(emailData);

    await connection.end();

    if (sent) {
      console.log(`✅ Admin sent reminder email for trip ${tripId}`);
      return NextResponse.json({
        success: true,
        message: 'Reminder email sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send reminder email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error sending reminder:', error);
    return NextResponse.json(
      {
        error: 'Failed to send reminder',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
