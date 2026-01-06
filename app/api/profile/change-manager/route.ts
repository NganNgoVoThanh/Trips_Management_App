// app/api/profile/change-manager/route.ts
// API for requesting manager change

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import { validateEmailDomain, sendManagerConfirmationEmail } from '@/lib/manager-verification-service';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const body = await request.json();
    const { new_manager_email, reason } = body;

    if (!new_manager_email || new_manager_email.trim() === '') {
      return NextResponse.json(
        { error: 'Manager email is required' },
        { status: 400 }
      );
    }

    const userEmail = session.user.email!;
    const userName = session.user.name || userEmail;
    const newManagerEmailLower = new_manager_email.trim().toLowerCase();

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

      // Validate domain
      const isValidDomain = await validateEmailDomain(newManagerEmailLower);
      if (!isValidDomain) {
        return NextResponse.json(
          { error: 'Invalid email domain. Only company emails are allowed.' },
          { status: 400 }
        );
      }

      // Can't be same as user
      if (newManagerEmailLower === userEmail.toLowerCase()) {
        return NextResponse.json(
          { error: 'You cannot select yourself as manager' },
          { status: 400 }
        );
      }

      // Check if same as current manager
      if (user.manager_email && newManagerEmailLower === user.manager_email.toLowerCase()) {
        return NextResponse.json(
          { error: 'This is already your current manager' },
          { status: 400 }
        );
      }

      const oldManagerEmail = user.manager_email;

      // Update pending manager
      await connection.query(
        `UPDATE users
         SET pending_manager_email = ?,
             manager_change_requested_at = NOW(),
             manager_confirmed = FALSE
         WHERE email = ?`,
        [newManagerEmailLower, userEmail]
      );

      // Record change request
      await connection.query(
        `INSERT INTO manager_changes
         (user_id, old_manager_email, new_manager_email, reason, status, requested_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [user.id, oldManagerEmail, newManagerEmailLower, reason || null]
      );

      // Send confirmation email to new manager
      await sendManagerConfirmationEmail({
        userId: user.id, // user.id is string (VARCHAR), no need to convert
        userEmail: userEmail,
        userName: userName,
        managerEmail: newManagerEmailLower,
        type: 'change',
        oldManagerEmail: oldManagerEmail || undefined,
        reason: reason || undefined,
      });

      // Notify old manager if exists
      if (oldManagerEmail) {
        await sendOldManagerNotificationEmail({
          oldManagerEmail,
          userName,
          userEmail,
          newManagerEmail: newManagerEmailLower,
          reason: reason || undefined,
        });
      }

      console.log(`✅ Manager change request sent: ${userEmail} -> ${newManagerEmailLower}`);

      return NextResponse.json({
        success: true,
        message: 'Manager change request sent successfully',
        pendingManagerEmail: newManagerEmailLower,
      });
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('❌ Error in manager change request:', error);
    return NextResponse.json(
      {
        error: 'Failed to process manager change request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Notify old manager about the change request
 */
async function sendOldManagerNotificationEmail(data: {
  oldManagerEmail: string;
  userName: string;
  userEmail: string;
  newManagerEmail: string;
  reason?: string;
}) {
  const subject = `FYI: Manager Change Request - ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #757575, #BDBDBD); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #757575; border-radius: 4px; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; color: #666; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .notice { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Manager Change Notification</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">For Your Information</p>
    </div>

    <div class="content">
      <p>Dear Manager,</p>

      <p>This is to inform you that <strong>${data.userName}</strong> has requested to change their reporting manager.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #757575;">Change Details</h3>
        <div class="info-row">
          <span class="info-label">Employee:</span> ${data.userName} (${data.userEmail})
        </div>
        <div class="info-row">
          <span class="info-label">Current Manager:</span> ${data.oldManagerEmail} (You)
        </div>
        <div class="info-row">
          <span class="info-label">Requested New Manager:</span> ${data.newManagerEmail}
        </div>
        ${data.reason ? `
        <div class="info-row" style="margin-top: 15px;">
          <span class="info-label">Reason Provided:</span>
          <div style="margin-top: 5px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            ${data.reason}
          </div>
        </div>
        ` : ''}
      </div>

      <div class="notice">
        <strong>ℹ️ No Action Required</strong>
        <p style="margin: 10px 0 0 0;">
          This is for your information only. The change will take effect once the new manager confirms.
          If you believe this change is incorrect, please contact HR immediately.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated email from Trip Management System</p>
      <p>For questions, please contact your HR department</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: data.oldManagerEmail,
    subject,
    html,
  });
}
