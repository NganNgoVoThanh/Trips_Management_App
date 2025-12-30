// app/api/profile/setup/route.ts
// Complete profile setup after first login with email-based manager verification

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import { validateEmailDomain, sendManagerConfirmationEmail } from '@/lib/manager-verification-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile data from request
    const body = await request.json();
    const {
      department,
      office_location,
      employee_id,
      manager_email,
      phone,
      pickup_address,
      pickup_notes,
    } = body;

    // Validate required fields
    if (!department || !office_location || !phone || !pickup_address) {
      return NextResponse.json(
        { error: 'Missing required fields: department, office_location, phone, and pickup_address' },
        { status: 400 }
      );
    }

    const userEmail = session.user.email!;
    const userName = session.user.name || userEmail;

    console.log(`📝 Saving profile setup for ${userEmail}`);

    // Get user from database
    const mysql = await import('mysql2/promise');
    const connection = await mysql.default.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    try {
      const user = await getUserByEmail(userEmail);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let pendingManagerConfirmation = false;

      // If manager_email provided, validate and send confirmation
      if (manager_email && manager_email.trim() !== '') {
        const managerEmailLower = manager_email.trim().toLowerCase();

        // Validate domain
        const isValidDomain = await validateEmailDomain(managerEmailLower);
        if (!isValidDomain) {
          return NextResponse.json(
            { error: 'Invalid email domain. Only company emails are allowed.' },
            { status: 400 }
          );
        }

        // Can't be same as user
        if (managerEmailLower === userEmail.toLowerCase()) {
          return NextResponse.json(
            { error: 'You cannot select yourself as manager' },
            { status: 400 }
          );
        }

        // Update user profile with pending manager
        await connection.query(
          `UPDATE users
           SET department = ?,
               office_location = ?,
               employee_id = ?,
               phone = ?,
               pickup_address = ?,
               pickup_notes = ?,
               pending_manager_email = ?,
               manager_confirmed = FALSE,
               profile_completed = TRUE,
               updated_at = NOW()
           WHERE email = ?`,
          [department, office_location, employee_id || null, phone, pickup_address, pickup_notes || null, managerEmailLower, userEmail]
        );

        // Send confirmation email to manager
        await sendManagerConfirmationEmail({
          userId: Number(user.id),
          userEmail: userEmail,
          userName: userName,
          managerEmail: managerEmailLower,
          type: 'initial',
        });

        pendingManagerConfirmation = true;
        console.log(`✅ Profile saved, confirmation email sent to ${managerEmailLower}`);
      } else {
        // No manager (CEO/C-Level) - auto-approve
        await connection.query(
          `UPDATE users
           SET department = ?,
               office_location = ?,
               employee_id = ?,
               phone = ?,
               pickup_address = ?,
               pickup_notes = ?,
               manager_email = NULL,
               manager_confirmed = TRUE,
               manager_confirmed_at = NOW(),
               profile_completed = TRUE,
               updated_at = NOW()
           WHERE email = ?`,
          [department, office_location, employee_id || null, phone, pickup_address, pickup_notes || null, userEmail]
        );

        console.log(`✅ Profile completed for ${userEmail} (no manager)`);
      }

      return NextResponse.json({
        success: true,
        message: 'Profile setup completed successfully',
        pendingManagerConfirmation,
      });
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('❌ Error in profile setup:', error);
    return NextResponse.json(
      {
        error: 'Failed to save profile',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
