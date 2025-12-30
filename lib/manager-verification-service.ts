// lib/manager-verification-service.ts
// Service for email-based manager verification

import crypto from 'crypto';
import { sendEmail } from './email-service';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface ManagerConfirmationData {
  userId: number;
  userEmail: string;
  userName: string;
  managerEmail: string;
  type: 'initial' | 'change';
  oldManagerEmail?: string;
  reason?: string;
}

/**
 * Generate secure random token for email verification
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate email domain against whitelist
 */
export async function validateEmailDomain(email: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    throw new Error('validateEmailDomain can only be called on server side');
  }

  const mysql = await import('mysql2/promise');
  const connection = await mysql.default.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM allowed_email_domains WHERE domain = ? AND active = TRUE',
      [domain]
    );

    const result = rows as any[];
    return result[0].count > 0;
  } finally {
    await connection.end();
  }
}

/**
 * Send manager confirmation request email
 */
export async function sendManagerConfirmationEmail(data: ManagerConfirmationData): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('sendManagerConfirmationEmail can only be called on server side');
  }

  const mysql = await import('mysql2/promise');
  const connection = await mysql.default.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Store confirmation token
    await connection.query(
      `INSERT INTO manager_confirmations
       (user_id, manager_email, token, type, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [data.userId, data.managerEmail, token, data.type, expiresAt]
    );

    // Generate confirmation URLs
    const confirmUrl = `${BASE_URL}/api/manager/confirm?token=${token}&action=confirm`;
    const rejectUrl = `${BASE_URL}/api/manager/confirm?token=${token}&action=reject`;

    // Send email based on type
    if (data.type === 'initial') {
      await sendInitialConfirmationEmail({
        ...data,
        confirmUrl,
        rejectUrl,
        expiresAt,
      });
    } else {
      await sendChangeConfirmationEmail({
        ...data,
        confirmUrl,
        rejectUrl,
        expiresAt,
      });
    }

    return token;
  } finally {
    await connection.end();
  }
}

/**
 * Send initial manager confirmation email
 */
async function sendInitialConfirmationEmail(data: ManagerConfirmationData & { confirmUrl: string; rejectUrl: string; expiresAt: Date }) {
  const subject = `Action Required: Manager Confirmation for ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #C00000, #E57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #C00000; border-radius: 4px; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; color: #666; }
    .buttons { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .btn-confirm { background: #4CAF50; color: white; }
    .btn-reject { background: #f44336; color: white; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Manager Confirmation Required</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Trip Management System</p>
    </div>

    <div class="content">
      <p>Dear Manager,</p>

      <p><strong>${data.userName}</strong> has selected you as their reporting manager in the Trip Management System.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #C00000;">Employee Details</h3>
        <div class="info-row">
          <span class="info-label">Name:</span> ${data.userName}
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span> ${data.userEmail}
        </div>
      </div>

      <p><strong>What does this mean?</strong></p>
      <p>By confirming this relationship, you agree to:</p>
      <ul>
        <li>Review and approve/reject business trip requests from this employee</li>
        <li>Receive email notifications for pending trip approvals</li>
        <li>Be listed as the reporting manager for this employee</li>
      </ul>

      <div class="buttons">
        <a href="${data.confirmUrl}" class="btn btn-confirm">✓ CONFIRM</a>
        <a href="${data.rejectUrl}" class="btn btn-reject">✗ REJECT</a>
      </div>

      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul style="margin: 10px 0;">
          <li>This link will expire on <strong>${data.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
          <li>If you did not expect this request, please reject it or contact HR</li>
          <li>Only confirm if you are indeed this employee's direct manager</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated email from Trip Management System</p>
      <p>If you have questions, please contact your HR department</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: data.managerEmail,
    subject,
    html,
  });
}

/**
 * Send manager change confirmation email
 */
async function sendChangeConfirmationEmail(data: ManagerConfirmationData & { confirmUrl: string; rejectUrl: string; expiresAt: Date }) {
  const subject = `Action Required: Manager Change Request for ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #C00000, #E57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #C00000; border-radius: 4px; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; color: #666; }
    .buttons { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .btn-confirm { background: #4CAF50; color: white; }
    .btn-reject { background: #f44336; color: white; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .change-notice { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Manager Change Request</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Trip Management System</p>
    </div>

    <div class="content">
      <p>Dear Manager,</p>

      <p><strong>${data.userName}</strong> has requested to change their reporting manager to you.</p>

      <div class="change-notice">
        <strong>📋 Change Details:</strong>
        <div style="margin-top: 10px;">
          <div><strong>Previous Manager:</strong> ${data.oldManagerEmail || 'None'}</div>
          <div><strong>New Manager:</strong> ${data.managerEmail} (You)</div>
          ${data.reason ? `<div style="margin-top: 10px;"><strong>Reason:</strong> ${data.reason}</div>` : ''}
        </div>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #C00000;">Employee Details</h3>
        <div class="info-row">
          <span class="info-label">Name:</span> ${data.userName}
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span> ${data.userEmail}
        </div>
      </div>

      <p><strong>What happens if you confirm?</strong></p>
      <ul>
        <li>You will become the reporting manager for ${data.userName}</li>
        <li>You will approve/reject their business trip requests</li>
        <li>The previous manager will be notified of this change</li>
      </ul>

      <div class="buttons">
        <a href="${data.confirmUrl}" class="btn btn-confirm">✓ CONFIRM</a>
        <a href="${data.rejectUrl}" class="btn btn-reject">✗ REJECT</a>
      </div>

      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul style="margin: 10px 0;">
          <li>This link will expire on <strong>${data.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
          <li>Only confirm if you are indeed this employee's new direct manager</li>
          <li>If this change seems incorrect, please reject it and contact HR</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated email from Trip Management System</p>
      <p>If you have questions, please contact your HR department</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: data.managerEmail,
    subject,
    html,
  });

  // Also notify old manager
  if (data.oldManagerEmail) {
    await sendOldManagerNotification({
      oldManagerEmail: data.oldManagerEmail,
      userName: data.userName,
      userEmail: data.userEmail,
      newManagerEmail: data.managerEmail,
      reason: data.reason,
    });
  }
}

/**
 * Notify old manager about the change
 */
async function sendOldManagerNotification(data: {
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

/**
 * Verify manager confirmation token and process
 */
export async function processManagerConfirmation(token: string, action: 'confirm' | 'reject'): Promise<{ success: boolean; message: string; redirect?: string }> {
  if (typeof window !== 'undefined') {
    throw new Error('processManagerConfirmation can only be called on server side');
  }

  const mysql = await import('mysql2/promise');
  const connection = await mysql.default.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Find confirmation token
    const [rows] = await connection.query(
      `SELECT mc.*, u.email as user_email, u.name as user_name
       FROM manager_confirmations mc
       JOIN users u ON mc.user_id = u.id
       WHERE mc.token = ? AND mc.confirmed = FALSE`,
      [token]
    );

    const confirmations = rows as any[];
    if (confirmations.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired confirmation link',
      };
    }

    const confirmation = confirmations[0];

    // Check if expired
    if (new Date() > new Date(confirmation.expires_at)) {
      return {
        success: false,
        message: 'This confirmation link has expired',
      };
    }

    if (action === 'confirm') {
      // Update user's manager
      await connection.query(
        `UPDATE users
         SET manager_email = ?,
             manager_confirmed = TRUE,
             manager_confirmed_at = NOW(),
             pending_manager_email = NULL,
             manager_change_requested_at = NULL
         WHERE id = ?`,
        [confirmation.manager_email, confirmation.user_id]
      );

      // Mark confirmation as completed
      await connection.query(
        `UPDATE manager_confirmations
         SET confirmed = TRUE, confirmed_at = NOW()
         WHERE id = ?`,
        [confirmation.id]
      );

      // Send success emails
      await sendManagerConfirmedEmail({
        userEmail: confirmation.user_email,
        userName: confirmation.user_name,
        managerEmail: confirmation.manager_email,
      });

      return {
        success: true,
        message: 'Manager relationship confirmed successfully!',
        redirect: '/dashboard',
      };
    } else {
      // Rejection
      await connection.query(
        `DELETE FROM manager_confirmations WHERE id = ?`,
        [confirmation.id]
      );

      // Notify user about rejection
      await sendManagerRejectedEmail({
        userEmail: confirmation.user_email,
        userName: confirmation.user_name,
        managerEmail: confirmation.manager_email,
      });

      return {
        success: true,
        message: 'Manager relationship rejected',
      };
    }
  } finally {
    await connection.end();
  }
}

/**
 * Send email to user when manager confirms
 */
async function sendManagerConfirmedEmail(data: {
  userEmail: string;
  userName: string;
  managerEmail: string;
}) {
  const subject = '✅ Manager Confirmed - You Can Now Submit Trips';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50, #81C784); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .success-box { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .btn { display: inline-block; padding: 14px 30px; background: #C00000; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Manager Confirmed!</h1>
    </div>

    <div class="content">
      <p>Dear ${data.userName},</p>

      <div class="success-box">
        <h3 style="margin-top: 0; color: #4CAF50;">Great News!</h3>
        <p><strong>${data.managerEmail}</strong> has confirmed as your reporting manager.</p>
        <p>You can now submit business trip requests through the system!</p>
      </div>

      <div style="text-align: center;">
        <a href="${BASE_URL}/dashboard" class="btn">Go to Dashboard</a>
      </div>
    </div>

    <div class="footer">
      <p>Trip Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: data.userEmail,
    subject,
    html,
  });
}

/**
 * Send email to user when manager rejects
 */
async function sendManagerRejectedEmail(data: {
  userEmail: string;
  userName: string;
  managerEmail: string;
}) {
  const subject = '⚠️ Manager Confirmation Rejected';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f44336, #E57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .btn { display: inline-block; padding: 14px 30px; background: #C00000; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Manager Confirmation Rejected</h1>
    </div>

    <div class="content">
      <p>Dear ${data.userName},</p>

      <div class="warning-box">
        <h3 style="margin-top: 0; color: #f57c00;">Action Required</h3>
        <p><strong>${data.managerEmail}</strong> has declined to be your reporting manager.</p>
        <p>Please select a different manager to continue using the system.</p>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Verify with your manager if this was intentional</li>
        <li>Select the correct manager in your profile</li>
        <li>Contact HR if you need assistance</li>
      </ul>

      <div style="text-align: center;">
        <a href="${BASE_URL}/profile/setup" class="btn">Update Manager</a>
      </div>
    </div>

    <div class="footer">
      <p>Trip Management System</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: data.userEmail,
    subject,
    html,
  });
}
