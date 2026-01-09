// app/api/admin/create-trip-for-user/route.ts
// Admin endpoint to create trips on behalf of other users

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { sendApprovalEmail } from '@/lib/email-approval-service';
import { logAuditAction } from '@/lib/audit-log-service';
import { ensureTripsColumns } from '@/lib/database-migration';

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
      userName, // For manual entry users
      userEmployeeId, // For manual entry users
      userDepartment, // For manual entry users
      isManualEntry = false,
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
      notes,
    } = body;

    // Validate required fields
    if (!departureLocation || !destination || !departureDate || !departureTime || !returnDate || !returnTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const connection = await getConnection();

    let user: any;
    let autoApprove = false;

    if (isManualEntry) {
      // For manual entry - employees not in database yet
      if (!userName || !userEmployeeId || !userDepartment) {
        await connection.end();
        return NextResponse.json({ error: 'Employee name, ID, and department are required for manual entry' }, { status: 400 });
      }

      // Create a temporary user object for manual entry employee
      // Use provided email or generate temporary one based on employee ID
      const emailToUse = userEmail || `employee-${userEmployeeId}@temp.local`;

      user = {
        id: `temp-${userEmployeeId}`, // Use employee ID for consistent identification
        name: userName,
        email: emailToUse,
        employee_id: userEmployeeId,
        department: userDepartment,
        manager_email: null, // No manager assigned yet
        role: 'user',
      };

      // Manual entry trips are auto-approved since there's no manager assigned yet
      autoApprove = true;
    } else {
      // For existing users in database
      if (!userEmail) {
        await connection.end();
        return NextResponse.json({ error: 'User email is required' }, { status: 400 });
      }

      const [users] = await connection.query<any[]>(
        'SELECT * FROM users WHERE email = ?',
        [userEmail]
      );

      if (users.length === 0) {
        await connection.end();
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }

      user = users[0];

      // Check if auto-approve needed (CEO/Founder or no manager)
      autoApprove = !user.manager_email ||
                    user.role === 'ceo' ||
                    user.role === 'founder';
    }

    // Check if trip is urgent (less than 24 hours)
    const now = new Date();
    const tripDateTime = new Date(`${departureDate} ${departureTime}`);
    const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isUrgent = hoursUntilTrip < 24;

    // Create trip
    const tripId = uuidv4();

    // Determine final status based on user type and auto-approve logic
    const finalStatus = autoApprove ? (isManualEntry ? 'auto_approved' : 'approved_solo') : 'pending_approval';

    // Ensure all required columns exist (run migration if needed)
    try {
      await ensureTripsColumns();
    } catch (migrationError: any) {
      console.error('⚠️ Migration warning:', migrationError.message);
      // Continue anyway - columns might already exist
    }

    await connection.query(
      `INSERT INTO trips (
        id, user_id, user_name, user_email,
        departure_location, destination,
        departure_date, departure_time,
        return_date, return_time,
        purpose, vehicle_type, estimated_cost,
        status, manager_approval_status,
        is_urgent, auto_approved,
        created_by_admin, admin_email,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        finalStatus,
        autoApprove ? 'approved' : 'pending',
        isUrgent ? 1 : 0,
        autoApprove ? 1 : 0,
        1, // created_by_admin
        session.user.email, // admin_email
        notes || null,
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
      newStatus: autoApprove ? (isManualEntry ? 'auto_approved' : 'approved_solo') : 'pending_approval',
      notes: `Trip created by admin for ${isManualEntry ? 'employee (manual entry)' : 'registered user'}: ${user.name}${isManualEntry ? ` (ID: ${userEmployeeId})` : ''}`,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Send approval email if not auto-approved (only for registered users with managers)
    if (!autoApprove && !isManualEntry && user.manager_email) {
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
    if (isManualEntry) {
      console.log(`✅ Trip created for employee via manual entry: ${user.name} (ID: ${userEmployeeId}) - auto-approved`);
      if (userEmail && !userEmail.endsWith('@temp.local')) {
        console.log(`   📧 Sending notification to: ${userEmail}`);
        try {
          // Import email service at the top if not already imported
          const { emailService } = await import('@/lib/email-service');

          // Create trip object for email
          const tripForEmail = {
            id: tripId,
            userId: user.id,
            userName: user.name,
            userEmail: userEmail,
            departureLocation,
            destination,
            departureDate,
            departureTime,
            returnDate,
            returnTime,
            vehicleType,
            estimatedCost,
            status: finalStatus,
            notified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any; // Cast to any to allow partial Trip object for email

          // Send trip confirmation email
          await emailService.sendTripConfirmation(tripForEmail);

          // Also send to CC emails if provided
          if (ccEmails && ccEmails.length > 0) {
            await emailService.sendEmail({
              to: ccEmails,
              subject: `Trip Created for ${user.name}`,
              body: `A trip has been created for ${user.name} (${userEmail}).\n\nTrip Details:\n• From: ${departureLocation}\n• To: ${destination}\n• Departure: ${departureDate} at ${departureTime}\n• Return: ${returnDate} at ${returnTime}\n• Status: ${finalStatus}`,
              category: 'notification'
            });
            console.log(`   📧 CC notification sent to: ${ccEmails.join(', ')}`);
          }

          console.log(`   ✅ Email sent successfully to ${userEmail}`);
        } catch (emailError: any) {
          console.error('   ❌ Failed to send notification email:', emailError.message);
          // Don't fail the trip creation if email fails
        }
      } else {
        console.log(`   ⚠️ No email provided - employee should be notified manually`);
      }
    } else if (autoApprove) {
      console.log(`✅ Trip auto-approved for ${user.email} (created by admin)`);
      try {
        const { emailService } = await import('@/lib/email-service');
        const tripForEmail = {
          id: tripId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          departureLocation,
          destination,
          departureDate,
          departureTime,
          returnDate,
          returnTime,
          vehicleType,
          estimatedCost,
          status: finalStatus,
          notified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any; // Cast to any to allow partial Trip object for email
        await emailService.sendApprovalNotification(tripForEmail);
        console.log(`   ✅ Approval notification sent to ${user.email}`);
      } catch (emailError: any) {
        console.error('   ❌ Failed to send approval notification:', emailError.message);
      }
    } else {
      console.log(`✅ Trip created for ${user.email}, awaiting manager approval`);
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      tripId,
      status: autoApprove ? (isManualEntry ? 'auto_approved' : 'approved_solo') : 'pending_approval',
      isManualEntry,
      employeeId: isManualEntry ? userEmployeeId : undefined,
      message: isManualEntry
        ? userEmail && !userEmail.endsWith('@temp.local')
          ? `Trip created successfully for employee ${user.name} (auto-approved). Confirmation sent to ${userEmail}.`
          : `Trip created successfully for employee ${user.name} (auto-approved). No email on file - please notify employee manually.`
        : autoApprove
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
