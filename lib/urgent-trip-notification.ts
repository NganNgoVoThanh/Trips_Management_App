// lib/urgent-trip-notification.ts
// Service to notify admins when an urgent trip (<24h) is created

import { emailService } from './email-service';
import mysql from 'mysql2/promise';

interface UrgentTripData {
  tripId: string;
  userName: string;
  userEmail: string;
  departureLocation: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  purpose?: string;
  estimatedCost?: number;
  hoursUntilDeparture: number;
}

async function getAdminEmails(departureLocation?: string, destination?: string): Promise<string[]> {
  let connection: mysql.Connection | null = null;
  const adminEmails: string[] = [];

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get all admins
    const [admins] = await connection.query(`
      SELECT
        u.email,
        u.name,
        u.admin_type,
        u.admin_location_id
      FROM users u
      WHERE u.role = 'admin'
        AND u.status = 'active'
        AND u.email IS NOT NULL
    `) as any[];

    for (const admin of admins) {
      // Super Admin gets all notifications
      if (admin.admin_type === 'super_admin') {
        if (admin.email && !adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
        }
        continue;
      }

      // Location Admin only gets notifications for their location
      if (admin.admin_type === 'location_admin' && admin.admin_location_id) {
        // Get location name
        const [locRows] = await connection.query(
          'SELECT name FROM locations WHERE id = ? LIMIT 1',
          [admin.admin_location_id]
        ) as any[];

        const locationName = locRows.length > 0 ? locRows[0].name : admin.admin_location_id;

        // Check if trip involves this location
        const tripInvolvesLocation =
          departureLocation === admin.admin_location_id ||
          departureLocation === locationName ||
          destination === admin.admin_location_id ||
          destination === locationName;

        if (tripInvolvesLocation && admin.email && !adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
        }
      }
    }

    // Fallback to environment variable if no admins found
    if (adminEmails.length === 0) {
      if (process.env.SUPER_ADMIN_EMAIL) {
        adminEmails.push(process.env.SUPER_ADMIN_EMAIL);
      }
      if (process.env.ADMIN_EMAIL && !adminEmails.includes(process.env.ADMIN_EMAIL)) {
        adminEmails.push(process.env.ADMIN_EMAIL);
      }
    }
  } catch (error) {
    console.error('❌ Error getting admin emails:', error);
    // Fallback to environment variables
    if (process.env.SUPER_ADMIN_EMAIL) {
      adminEmails.push(process.env.SUPER_ADMIN_EMAIL);
    }
    if (process.env.ADMIN_EMAIL && !adminEmails.includes(process.env.ADMIN_EMAIL)) {
      adminEmails.push(process.env.ADMIN_EMAIL);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  return adminEmails;
}

export async function sendUrgentTripNotificationToAdmins(tripData: UrgentTripData): Promise<void> {
  try {
    console.log(`📧 Sending urgent trip notification for trip ${tripData.tripId}...`);

    // Get relevant admin emails
    const adminEmails = await getAdminEmails(tripData.departureLocation, tripData.destination);

    if (adminEmails.length === 0) {
      console.warn('⚠️  No admin emails found for urgent trip notification');
      return;
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:50001';
    const overrideUrl = `${baseUrl}/admin/manual-override`;

    const subject = `🚨 URGENT TRIP APPROVAL NEEDED - Departure in ${tripData.hoursUntilDeparture}h`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">
      🚨 URGENT TRIP APPROVAL NEEDED
    </h1>
  </div>

  <div style="background: #fff9f9; padding: 20px; border: 2px solid #fee2e2; border-top: none;">
    <div style="background: #fecaca; padding: 15px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
      <p style="margin: 0; font-weight: bold; font-size: 18px; color: #991b1b;">
        ⏰ Departure in ${tripData.hoursUntilDeparture} hours!
      </p>
      <p style="margin: 5px 0 0 0; color: #991b1b;">
        This trip requires immediate approval as departure is less than 24 hours away.
      </p>
    </div>

    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151;">Trip Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User:</td>
          <td style="padding: 8px 0; font-weight: 600;">${tripData.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
          <td style="padding: 8px 0;">${tripData.userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">From:</td>
          <td style="padding: 8px 0; font-weight: 600;">${tripData.departureLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">To:</td>
          <td style="padding: 8px 0; font-weight: 600;">${tripData.destination}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Departure:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${tripData.departureDate} at ${tripData.departureTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Return:</td>
          <td style="padding: 8px 0;">${tripData.returnDate} at ${tripData.returnTime}</td>
        </tr>
        ${tripData.purpose ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Purpose:</td>
          <td style="padding: 8px 0;">${tripData.purpose}</td>
        </tr>
        ` : ''}
        ${tripData.estimatedCost ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Est. Cost:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #2563eb;">
            ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tripData.estimatedCost)}
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Trip ID:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${tripData.tripId}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;">
        <strong>⚠️ Action Required:</strong> The manager approval link has been sent, but this trip is flagged as urgent due to the short notice. Please monitor and be ready to manually approve if the manager doesn't respond in time.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${overrideUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Go to Manual Override
      </a>
    </div>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px; text-align: center;">
      You're receiving this because you're an admin for Intersnack Trips Management System.
    </p>
  </div>

  <div style="background: #1f2937; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      Intersnack Trips Management System
    </p>
  </div>
</body>
</html>
    `;

    const text = `
URGENT TRIP APPROVAL NEEDED - Departure in ${tripData.hoursUntilDeparture} hours!

User: ${tripData.userName} (${tripData.userEmail})
Route: ${tripData.departureLocation} → ${tripData.destination}
Departure: ${tripData.departureDate} at ${tripData.departureTime}
Return: ${tripData.returnDate} at ${tripData.returnTime}
${tripData.purpose ? `Purpose: ${tripData.purpose}` : ''}

This trip requires immediate attention as departure is less than 24 hours away.
Please visit ${overrideUrl} to review and approve if necessary.

Trip ID: ${tripData.tripId}
    `;

    // Send email to all relevant admins
    for (const adminEmail of adminEmails) {
      try {
        await emailService.sendEmail({
          to: adminEmail,
          subject,
          html,
          text,
        });
        console.log(`✅ Sent urgent trip notification to admin: ${adminEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send urgent trip notification to ${adminEmail}:`, emailError);
      }
    }

    console.log(`✅ Urgent trip notification sent to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error('❌ Error sending urgent trip notification to admins:', error);
    // Don't throw - we don't want to fail trip creation if email fails
  }
}
