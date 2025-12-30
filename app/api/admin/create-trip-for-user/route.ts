// app/api/admin/create-trip-for-user/route.ts
// Admin endpoint to create trips on behalf of other users

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { sendApprovalEmail } from '@/lib/email-approval-service';
import { logAuditAction } from '@/lib/audit-log-service';

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

    const body = await request.json();
    const {
      userEmail,
      departureLocation,
      destination,
      departureDate,
      departureTime,
      returnDate,
      returnTime,
      purpose,
      vehicleType,
      estimatedCost,
      ccEmails = [],
    } = body;

    // Validate required fields
    if (!userEmail || !departureLocation || !destination || !departureDate || !departureTime || !returnDate || !returnTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const connection = await getConnection();

    // Get user details
    const [users] = await connection.query<any[]>(
      'SELECT * FROM users WHERE email = ?',
      [userEmail]
    );

    if (users.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Check if trip is urgent (less than 24 hours)
    const now = new Date();
    const tripDateTime = new Date(`${departureDate} ${departureTime}`);
    const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isUrgent = hoursUntilTrip < 24;

    // Check if auto-approve needed (CEO/Founder or no manager)
    const autoApprove = !user.manager_email ||
                        user.role === 'ceo' ||
                        user.role === 'founder';

    // Create trip
    const tripId = uuidv4();
    await connection.query(
      `INSERT INTO trips (
        id, user_id, user_name, user_email,
        departure_location, destination,
        departure_date, departure_time,
        return_date, return_time,
        purpose, vehicle_type, estimated_cost,
        status, manager_approval_status,
        is_urgent, auto_approved,
        created_by_admin, admin_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tripId,
        user.id,
        user.name,
        user.email,
        departureLocation,
        destination,
        departureDate,
        departureTime,
        returnDate,
        returnTime,
        purpose || null,
        vehicleType || null,
        estimatedCost || null,
        autoApprove ? 'approved' : 'pending',
        autoApprove ? 'approved' : 'pending',
        isUrgent ? 1 : 0,
        autoApprove ? 1 : 0,
        1, // created_by_admin
        session.user.email, // admin_email
      ]
    );

    // Log audit action
    await logAuditAction({
      tripId,
      action: 'trip_created_by_admin',
      actorEmail: session.user.email || 'unknown',
      actorName: session.user.name || undefined,
      actorRole: session.user.role as 'user' | 'manager' | 'admin',
      oldStatus: null,
      newStatus: autoApprove ? 'approved' : 'pending',
      notes: `Trip created by admin for user ${userEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Send approval email if not auto-approved
    if (!autoApprove && user.manager_email) {
      try {
        await sendApprovalEmail({
          tripId,
          userName: user.name,
          userEmail: user.email,
          managerName: user.manager_name,
          managerEmail: user.manager_email,
          ccEmails,
          isUrgent,
          tripDetails: {
            departureLocation,
            destination,
            departureDate,
            departureTime,
            returnDate,
            returnTime,
            purpose,
          },
        });

        console.log(`✅ Approval email sent to manager: ${user.manager_email}`);
      } catch (emailError: any) {
        console.error('❌ Failed to send approval email:', emailError);
        // Don't fail the trip creation if email fails
      }
    }

    // Send notification to user
    if (autoApprove) {
      console.log(`✅ Trip auto-approved for ${userEmail} (created by admin)`);
    } else {
      console.log(`✅ Trip created for ${userEmail}, awaiting manager approval`);
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      tripId,
      status: autoApprove ? 'approved' : 'pending',
      message: autoApprove
        ? 'Trip created and auto-approved successfully'
        : 'Trip created, awaiting manager approval',
    });
  } catch (error: any) {
    console.error('❌ Error creating trip for user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create trip',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
