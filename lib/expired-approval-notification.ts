// lib/expired-approval-notification.ts
// Email notifications for expired approval links

import { emailService } from './email-service';

export interface ExpiredNotificationData {
  tripId: string;
  userEmail: string;
  userName: string;
  managerEmail: string;
  managerName: string;
  tripDetails: {
    departureLocation: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    returnDate: string;
    returnTime: string;
    purpose?: string;
  };
  expiredHours: number;
}

/**
 * Send notification to user when approval link is expired
 */
export async function sendExpiredLinkNotificationToUser(data: ExpiredNotificationData): Promise<void> {
  const subject = '⚠️ Your Trip Approval Request Needs Attention';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ffc107; color: #000; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .warning-box {
      background: #fff3cd;
      padding: 15px;
      border-left: 4px solid #ffc107;
      margin: 20px 0;
      border-radius: 4px;
    }
    .trip-details {
      background-color: #f9fafb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .action-box {
      background: #e3f2fd;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⚠️ Trip Approval Request Needs Attention</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${data.userName}</strong>,</p>

      <div class="warning-box">
        <p style="margin: 0;"><strong>⏰ Approval Link Has Expired</strong></p>
        <p style="margin: 5px 0 0 0;">The approval link sent to manager <strong>${data.managerName}</strong> has expired after ${data.expiredHours} hours.</p>
      </div>

      <div class="trip-details">
        <h3 style="margin-top: 0;">Trip Details:</h3>
        <p><strong>From:</strong> ${data.tripDetails.departureLocation}</p>
        <p><strong>To:</strong> ${data.tripDetails.destination}</p>
        <p><strong>Departure:</strong> ${data.tripDetails.departureDate} at ${data.tripDetails.departureTime}</p>
        <p><strong>Return:</strong> ${data.tripDetails.returnDate} at ${data.tripDetails.returnTime}</p>
        ${data.tripDetails.purpose ? `<p><strong>Purpose:</strong> ${data.tripDetails.purpose}</p>` : ''}
        <p><strong>Trip ID:</strong> <code>${data.tripId}</code></p>
      </div>

      <div class="action-box">
        <h3 style="margin-top: 0;">🔧 Action Required:</h3>
        <p>Please contact Admin for manual processing:</p>
        <ul>
          <li>Contact the admin team via Slack/Teams</li>
          <li>Or submit a new trip request through the system</li>
        </ul>
        <p style="margin-bottom: 0;">Provide the <strong>Trip ID</strong> when contacting Admin for faster processing.</p>
      </div>

      <p>Admin will review and process your request as soon as possible.</p>

      <div class="footer">
        <p>Best regards,<br/>Intersnack Cashew Company</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
⚠️ TRIP APPROVAL REQUEST NEEDS ATTENTION

Hello ${data.userName},

⏰ APPROVAL LINK HAS EXPIRED
The approval link sent to manager ${data.managerName} has expired after ${data.expiredHours} hours.

TRIP DETAILS:
- From: ${data.tripDetails.departureLocation}
- To: ${data.tripDetails.destination}
- Departure: ${data.tripDetails.departureDate} at ${data.tripDetails.departureTime}
- Return: ${data.tripDetails.returnDate} at ${data.tripDetails.returnTime}
${data.tripDetails.purpose ? `- Purpose: ${data.tripDetails.purpose}` : ''}
- Trip ID: ${data.tripId}

🔧 ACTION REQUIRED:
Please contact Admin for manual processing:
- Contact the admin team via Slack/Teams
- Or submit a new trip request through the system

Provide the Trip ID when contacting Admin for faster processing.

Admin will review and process your request as soon as possible.

Best regards,
Intersnack Cashew Company
  `.trim();

  await emailService.sendEmail({
    to: data.userEmail,
    subject,
    text,
    html,
  });

  console.log(`✅ Sent expired link notification to user: ${data.userEmail}`);
}

/**
 * Send notification to admin when approval link is expired
 */
export async function sendExpiredLinkNotificationToAdmin(data: ExpiredNotificationData): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('⚠️ ADMIN_EMAIL not configured, skipping admin notification');
    return;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001';

  const subject = `🔔 [Action Required] Expired Approval Link - ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .info-box {
      background-color: #f9fafb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .action-button {
      display: inline-block;
      background-color: #2196f3;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 15px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🔔 Trip Needs Manual Processing</h2>
    </div>
    <div class="content">
      <p><strong>Approval link has expired</strong> for the following trip:</p>

      <div class="info-box">
        <p><strong>Employee:</strong> ${data.userName} (${data.userEmail})</p>
        <p><strong>Manager:</strong> ${data.managerName} (${data.managerEmail})</p>
        <p><strong>Trip ID:</strong> <code>${data.tripId}</code></p>
        <p><strong>Expired:</strong> ${data.expiredHours} hours ago</p>
        <p><strong>Status:</strong> PENDING_MANAGER_APPROVAL</p>
      </div>

      <div class="info-box">
        <p style="margin-top: 0;"><strong>Trip Details:</strong></p>
        <p><strong>From:</strong> ${data.tripDetails.departureLocation}</p>
        <p><strong>To:</strong> ${data.tripDetails.destination}</p>
        <p><strong>Departure:</strong> ${data.tripDetails.departureDate} at ${data.tripDetails.departureTime}</p>
        <p><strong>Return:</strong> ${data.tripDetails.returnDate} at ${data.tripDetails.returnTime}</p>
        ${data.tripDetails.purpose ? `<p><strong>Purpose:</strong> ${data.tripDetails.purpose}</p>` : ''}
      </div>

      <p><strong>Action Required:</strong></p>
      <p>Please access Admin Manual Override to process this trip:</p>

      <a href="${baseUrl}/admin/manual-override" class="action-button">
        🔧 Process Manual Override
      </a>

      <div class="footer">
        <p>This email was sent automatically from Trips Management System.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
🔔 TRIP NEEDS MANUAL PROCESSING

Approval link has expired for the following trip:

TRIP INFORMATION:
- Employee: ${data.userName} (${data.userEmail})
- Manager: ${data.managerName} (${data.managerEmail})
- Trip ID: ${data.tripId}
- Expired: ${data.expiredHours} hours ago
- Status: PENDING_MANAGER_APPROVAL

DETAILS:
- From: ${data.tripDetails.departureLocation}
- To: ${data.tripDetails.destination}
- Departure: ${data.tripDetails.departureDate} at ${data.tripDetails.departureTime}
- Return: ${data.tripDetails.returnDate} at ${data.tripDetails.returnTime}
${data.tripDetails.purpose ? `- Purpose: ${data.tripDetails.purpose}` : ''}

ACTION REQUIRED:
Please access Admin Manual Override to process:
${baseUrl}/admin/manual-override

---
This email was sent automatically from Trips Management System.
  `.trim();

  await emailService.sendEmail({
    to: adminEmail,
    subject,
    text,
    html,
  });

  console.log(`✅ Sent expired link notification to admin: ${adminEmail}`);
}

/**
 * Calculate hours since trip creation
 */
export function calculateExpiredHours(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}
