#!/usr/bin/env node
/**
 * Resend Manager Confirmation Email
 * For users who already have pending_manager_email but no confirmation record was created
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Get OAuth2 access token
async function getGraphAccessToken() {
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('Token request failed: ' + response.status + ' - ' + error);
  }

  const data = await response.json();
  return data.access_token;
}

// Send email via Graph API
async function sendEmailViaGraph(to, subject, html) {
  const accessToken = await getGraphAccessToken();

  const senderEmail = process.env.EMAIL_NO_REPLY || 'no-reply.trips@intersnack.com.vn';
  const sendMailEndpoint = 'https://graph.microsoft.com/v1.0/users/' + senderEmail + '/sendMail';

  console.log('Sending email via Graph API...');
  console.log('From:', senderEmail);
  console.log('To:', to);

  const emailMessage = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        { emailAddress: { address: to } }
      ]
    },
    saveToSentItems: true
  };

  const response = await fetch(sendMailEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailMessage)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('Send email failed: ' + response.status + ' - ' + error);
  }

  console.log('Email sent successfully!');
  return true;
}

async function resendConfirmationEmail() {
  console.log('========================================');
  console.log('Resend Manager Confirmation Email');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Find users with pending_manager_email
    const [users] = await connection.query(
      'SELECT id, email, name, pending_manager_email FROM users WHERE pending_manager_email IS NOT NULL AND manager_confirmed = FALSE'
    );

    if (users.length === 0) {
      console.log('No users with pending manager confirmation found');
      return;
    }

    console.log('Found ' + users.length + ' user(s) with pending manager confirmation\n');

    for (const user of users) {
      console.log('Processing: ' + user.name + ' (' + user.email + ')');
      console.log('Pending Manager: ' + user.pending_manager_email);

      // Generate confirmation record
      const confirmationId = 'confirm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Delete any existing confirmation records for this user
      await connection.query(
        'DELETE FROM manager_confirmations WHERE user_id = ?',
        [user.id]
      );
      console.log('Cleared old confirmation records');

      // Insert new confirmation record with ALL required columns
      await connection.query(
        `INSERT INTO manager_confirmations
         (id, user_id, user_email, manager_email, pending_manager_email, token, confirmation_token, type, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [confirmationId, user.id, user.email, user.pending_manager_email, user.pending_manager_email, token, token, 'initial', expiresAt]
      );
      console.log('Created confirmation record: ' + confirmationId);

      // Generate URLs
      const confirmUrl = BASE_URL + '/api/manager/confirm?token=' + token + '&action=confirm';
      const rejectUrl = BASE_URL + '/api/manager/confirm?token=' + token + '&action=reject';

      // Send email with NEW clean template
      const subject = '[Action Required] Manager Confirmation - ' + user.name;
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manager Confirmation</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">

  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Red Header Bar -->
          <tr>
            <td style="background-color: #C00000; padding: 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-size: 18px; font-weight: 700;">Trips Management</span>
                  </td>
                  <td align="right">
                    <span style="color: rgba(255,255,255,0.8); font-size: 12px;">Intersnack Vietnam</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 15px;">Dear Manager,</p>
              <p style="margin: 0 0 24px 0; color: #555; font-size: 14px;">
                <strong style="color: #C00000;">${user.name}</strong> (${user.email}) has requested you as their reporting manager.
              </p>

              <!-- Question -->
              <p style="margin: 0 0 24px 0; color: #333; font-size: 14px; font-weight: 600; text-align: center;">
                Do you confirm this manager-employee relationship?
              </p>

              <!-- Action Buttons - Outlook Desktop Compatible -->
              <table cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 32px auto;">
                <tr>
                  <td align="center" style="padding-right: 10px;">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #16a34a; border-radius: 6px;">
                          <a href="${confirmUrl}" target="_blank" style="font-size: 15px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; padding: 14px 36px; font-family: Arial, sans-serif;">CONFIRM</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="center" style="padding-left: 10px;">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #ffffff; border: 2px solid #dc2626; border-radius: 6px;">
                          <a href="${rejectUrl}" target="_blank" style="font-size: 15px; font-weight: bold; color: #dc2626; text-decoration: none; display: inline-block; padding: 12px 34px; font-family: Arial, sans-serif;">DECLINE</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Brief Info -->
              <p style="margin: 0 0 8px 0; color: #666; font-size: 13px; font-weight: 600;">By confirming, you will:</p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #666; font-size: 13px; line-height: 1.7;">
                <li>Review and approve/reject trip requests from this employee</li>
                <li>Receive email notifications for pending approvals</li>
              </ul>

              <!-- Expiry Notice -->
              <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999; font-size: 12px;">
                This link expires on <strong>${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>. No login required.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999; font-size: 11px;">
                Trips Management System &copy; ${new Date().getFullYear()} Intersnack Vietnam<br>
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
      `;

      try {
        await sendEmailViaGraph(user.pending_manager_email, subject, html);
        console.log('SUCCESS! Email sent to ' + user.pending_manager_email + '\n');
      } catch (error) {
        console.log('ERROR sending email: ' + error.message + '\n');
      }
    }

    // Verify confirmation records were created
    const [records] = await connection.query('SELECT * FROM manager_confirmations ORDER BY created_at DESC LIMIT 5');
    console.log('========================================');
    console.log('Verification - Confirmation records created: ' + records.length);
    records.forEach(r => {
      console.log('  - ' + r.manager_email + ' (User: ' + r.user_email + ')');
    });

  } finally {
    await connection.end();
  }

  console.log('\n========================================');
  console.log('Done! Manager should check their inbox.');
  console.log('========================================');
}

resendConfirmationEmail().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
