// scripts/check-expired-approvals.js
// Cron job: Check and send notifications for expired approval tokens (>48h)
// Runs every 6 hours to check for expired approval tokens and send notifications

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

async function sendExpiredNotification(tripData) {
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001';
  const adminEmail = process.env.ADMIN_EMAIL; // Admin email from environment

  // Email to user
  const userEmailOptions = {
    from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
    to: tripData.user_email,
    subject: '⚠️ Your Trip Approval Request Needs Attention',
    html: `
      <h2>⚠️ Trip Approval Request Needs Attention</h2>
      <p>Hello <strong>${tripData.user_name}</strong>,</p>
      <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p><strong>⏰ Approval Link Has Expired</strong></p>
        <p>The approval link sent to manager <strong>${tripData.manager_name || 'Manager'}</strong> has expired after ${tripData.hours_old} hours.</p>
      </div>
      <div style="background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px;">
        <h3>Trip Details:</h3>
        <p><strong>From:</strong> ${tripData.departure_location}</p>
        <p><strong>To:</strong> ${tripData.destination}</p>
        <p><strong>Departure Date:</strong> ${tripData.departure_date}</p>
        <p><strong>Trip ID:</strong> <code>${tripData.id}</code></p>
      </div>
      <div style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3>🔧 Action Required:</h3>
        <p>Please contact Admin for manual processing:</p>
        <ul>
          <li>Email: <a href="mailto:${adminEmail}">${adminEmail}</a></li>
          <li>Or contact directly via Slack/Teams</li>
        </ul>
      </div>
      <p>Best regards,<br/>Intersnack Trips Management Team</p>
    `,
  };

  // Email to admin
  const adminEmailOptions = {
    from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
    to: adminEmail,
    subject: `🔔 [Action Required] Expired Approval Link - ${tripData.user_name}`,
    html: `
      <h2>🔔 Trip Needs Manual Processing</h2>
      <p><strong>Approval link has expired</strong> for the following trip:</p>
      <div style="background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px;">
        <p><strong>Employee:</strong> ${tripData.user_name} (${tripData.user_email})</p>
        <p><strong>Manager:</strong> ${tripData.manager_name || 'N/A'} (${tripData.manager_email || 'N/A'})</p>
        <p><strong>Trip ID:</strong> <code>${tripData.id}</code></p>
        <p><strong>Expired:</strong> ${tripData.hours_old} hours ago</p>
        <p><strong>Status:</strong> PENDING_MANAGER_APPROVAL</p>
      </div>
      <p><strong>Action Required:</strong></p>
      <p>Please access Admin Manual Override to process this trip:</p>
      <a href="${baseUrl}/admin/manual-override" style="display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0;">
        🔧 Process Manual Override
      </a>
    `,
  };

  try {
    await transporter.sendMail(userEmailOptions);
    await transporter.sendMail(adminEmailOptions);
    console.log(`   ✅ Sent notifications for trip ${tripData.id}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to send notifications for trip ${tripData.id}:`, error.message);
    return false;
  }
}

async function checkExpiredApprovals() {
  const connection = await getConnection();

  try {
    console.log('\n⏰ [' + new Date().toLocaleString('en-US') + '] Checking expired approval tokens...\n');

    // Find trips with pending approval >48h that haven't been notified
    const [expiredTrips] = await connection.query(
      `SELECT
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
        t.created_at,
        TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_old,
        u.manager_email,
        u.manager_name
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.manager_approval_status = 'pending'
        AND TIMESTAMPDIFF(HOUR, t.created_at, NOW()) > 48
        AND (t.expired_notification_sent IS NULL OR t.expired_notification_sent = FALSE)
      ORDER BY t.created_at ASC`
    );

    if (expiredTrips.length === 0) {
      console.log('✅ No expired approvals found (or all already notified).');
      await connection.end();
      return;
    }

    console.log(`⚠️  Found ${expiredTrips.length} expired approval(s) needing notification:\n`);

    let notifiedCount = 0;
    for (const trip of expiredTrips) {
      console.log(`   • Trip ${trip.id} - ${trip.user_name}`);
      console.log(`     Route: ${trip.departure_location} → ${trip.destination}`);
      console.log(`     Created: ${new Date(trip.created_at).toLocaleString('en-US')} (${trip.hours_old}h ago)`);
      console.log(`     Manager: ${trip.manager_name || 'N/A'} (${trip.manager_email || 'N/A'})`);

      // Send notifications
      const success = await sendExpiredNotification(trip);

      if (success) {
        // Mark as notified
        await connection.query(
          `UPDATE trips SET expired_notification_sent = TRUE, expired_notified_at = NOW() WHERE id = ?`,
          [trip.id]
        );
        notifiedCount++;
      }
    }

    console.log(`\n✅ Sent notifications for ${notifiedCount}/${expiredTrips.length} trip(s)`);
    console.log(`   → Users and Admin have been notified to use Manual Override\n`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error checking expired approvals:', error);
    await connection.end();
    throw error;
  }
}

// Run immediately if called directly
if (require.main === module) {
  checkExpiredApprovals()
    .then(() => {
      console.log('✓ Expired approval check completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Expired approval check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkExpiredApprovals };
