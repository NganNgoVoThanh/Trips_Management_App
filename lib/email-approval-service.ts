// lib/email-approval-service.ts
// Email service for trip approval workflow
// Uses Microsoft Graph API via email-service.ts

import jwt from 'jsonwebtoken';
import { sendEmail, EmailNotification } from './email-service';

// ========================================
// TYPES
// ========================================

export interface ApprovalEmailData {
  tripId: string;
  userName: string;
  userEmail: string;
  managerEmail: string;
  managerName: string;
  ccEmails?: string[];
  tripDetails: {
    departureLocation: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    returnDate: string;
    returnTime: string;
    purpose?: string;
    vehicleType?: string;
    estimatedCost?: number;
    passengerCount?: number;
  };
  userDetails?: {
    department?: string;
    employeeId?: string;
    phone?: string;
    pickupAddress?: string;
    pickupNotes?: string;
  };
  isUrgent: boolean;
}

export interface ApprovalToken {
  tripId: string;
  managerEmail: string;
  action: 'approve' | 'reject';
}

export interface NoManagerNotificationData {
  userName: string;
  userEmail: string;
  department: string;
  officeLocation: string;
  employeeId?: string;
  phone: string;
}

// ========================================
// JWT TOKEN GENERATION
// ========================================

export function generateApprovalToken(data: ApprovalToken): string {
  const secret = process.env.APPROVAL_TOKEN_SECRET || 'default-secret-change-me';

  // Token expires in 48 hours
  return jwt.sign(data, secret, {
    expiresIn: '48h',
  });
}

export function verifyApprovalToken(token: string): ApprovalToken | null {
  try {
    const secret = process.env.APPROVAL_TOKEN_SECRET || 'default-secret-change-me';
    const decoded = jwt.verify(token, secret) as ApprovalToken;
    return decoded;
  } catch (error) {
    console.error('❌ Invalid or expired token:', error);
    return null;
  }
}

// ========================================
// EMAIL TEMPLATES
// ========================================

function generateApprovalEmailHTML(data: ApprovalEmailData, approveToken: string, rejectToken: string): string {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:50001';
  const approveUrl = `${appUrl}/api/trips/approve?token=${approveToken}`;
  const rejectUrl = `${appUrl}/api/trips/approve?token=${rejectToken}`;

  const urgentBadge = data.isUrgent
    ? `<div style="background: #C00000; color: white; padding: 12px 20px; border-radius: 6px; display: inline-block; margin-bottom: 24px; font-weight: 700; font-size: 14px; border-left: 4px solid #8B0000;">
      ⚠️ URGENT - Approval needed within 24 hours
    </div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Trip Approval Request</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #C00000; padding: 30px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px; }
    .content { padding: 40px; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px !important; }
      .btn { display: block !important; width: 100% !important; margin: 8px 0 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Business Trip Approval Request</h1>
      <p>Trips Management System • Intersnack Vietnam</p>
    </div>

    <!-- Content -->
    <div class="content">
      ${urgentBadge}

      <p style="font-size: 16px; margin-bottom: 12px; color: #111827; font-weight: 600;">
        Dear ${data.managerName},
      </p>

      <p style="margin-bottom: 24px; color: #4b5563; line-height: 1.6; font-size: 14px;">
        <strong>${data.userName}</strong> (<a href="mailto:${data.userEmail}" style="color: #C00000; text-decoration: none;">${data.userEmail}</a>) has submitted a business trip request that requires your approval.
      </p>

      <!-- Employee Info -->
      ${data.userDetails ? `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${data.userDetails.department ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 35%; font-size: 13px;">Department:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.department}</td>
          </tr>
          ` : ''}
          ${data.userDetails.employeeId ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Employee ID:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.employeeId}</td>
          </tr>
          ` : ''}
          ${data.userDetails.phone ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Phone:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.phone}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      ` : ''}

      <!-- Trip Details -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #C00000; padding: 24px; margin: 24px 0; border-radius: 6px;">
        <h3 style="margin-top: 0; color: #C00000; font-size: 18px; font-weight: 600; margin-bottom: 16px;">Trip Details</h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; width: 35%; font-size: 14px; font-weight: 500;">From:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.departureLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">To:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.destination}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Departure:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.departureDate} at ${data.tripDetails.departureTime} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Return:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.returnDate} at ${data.tripDetails.returnTime} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
          ${data.tripDetails.vehicleType ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Vehicle Type:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${
              data.tripDetails.vehicleType === 'car-4' ? '4-Seater Car' :
              data.tripDetails.vehicleType === 'car-7' ? '7-Seater Car' :
              data.tripDetails.vehicleType === 'van-16' ? '16-Seater Van' :
              data.tripDetails.vehicleType
            }</td>
          </tr>
          ` : ''}
          ${data.tripDetails.passengerCount ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Passengers:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.passengerCount} person(s)</td>
          </tr>
          ` : ''}
          ${data.tripDetails.estimatedCost ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Estimated Cost:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #C00000; font-size: 14px;">${data.tripDetails.estimatedCost.toLocaleString('vi-VN')} VND</td>
          </tr>
          ` : ''}
          ${data.tripDetails.purpose ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Purpose:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.purpose}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Pickup Information -->
      ${data.userDetails && (data.userDetails.pickupAddress || data.userDetails.pickupNotes) ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1; font-size: 14px; font-weight: 600;">Pickup Information</h4>
        ${data.userDetails.pickupAddress ? `
        <p style="margin: 4px 0; color: #374151; font-size: 13px;">
          <strong>Address:</strong> ${data.userDetails.pickupAddress}
        </p>
        ` : ''}
        ${data.userDetails.pickupNotes ? `
        <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">
          <strong>Notes:</strong> ${data.userDetails.pickupNotes}
        </p>
        ` : ''}
      </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 40px 0;">
        <p style="margin-bottom: 24px; font-weight: 600; color: #1f2937; font-size: 16px;">
          Please approve or reject this request:
        </p>

        <table style="width: 100%; max-width: 480px; margin: 0 auto;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 10px;">
              <a href="${approveUrl}" style="display: block; background-color: #10b981; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; text-align: center;">
                ✓ Approve Trip
              </a>
            </td>
            <td style="padding: 10px;">
              <a href="${rejectUrl}" style="display: block; background-color: #ffffff; color: #C00000 !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; border: 2px solid #C00000; text-align: center;">
                ✗ Reject Trip
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Important Notice -->
      <div style="background: #fffbeb; border: 1px solid #fbbf24; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin-top: 32px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
          <strong>Important:</strong> This approval link is valid for 48 hours. After this period, the request will be escalated to Admin for processing.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
          This email was sent automatically from<br>
          <strong style="color: #374151;">Trips Management System</strong><br>
          <span style="font-size: 12px; color: #9ca3af;">Intersnack Vietnam • trip.intersnack.com.vn</span>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 12px 0 0 0;">
          Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}

/**
 * Generate CC notification email (view-only, no action buttons)
 */
function generateCCNotificationHTML(data: ApprovalEmailData): string {
  const urgentBadge = data.isUrgent
    ? '<div style="background: #C00000; color: white; padding: 12px 20px; border-radius: 6px; display: inline-block; margin-bottom: 20px; font-weight: 600; font-size: 14px; border-left: 4px solid #8B0000;">⚠️ URGENT - Approval needed within 24 hours</div>'
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Trip Request - FYI</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="background-color: #C00000; padding: 30px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Business Trip Request - FYI</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px;">Trips Management System • Intersnack Vietnam</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      ${urgentBadge}

      <!-- Info Badge -->
      <div style="background: #e8f4f8; border: 1px solid #0369a1; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: #0369a1; font-size: 14px; font-weight: 600;">
          ℹ️ You are receiving this for information only
        </p>
      </div>

      <p style="font-size: 16px; margin-bottom: 12px; color: #111827; font-weight: 600;">Dear Team,</p>

      <p style="margin-bottom: 24px; color: #4b5563; line-height: 1.6; font-size: 14px;">
        <strong>${data.userName}</strong> (<a href="mailto:${data.userEmail}" style="color: #C00000; text-decoration: none;">${data.userEmail}</a>) has submitted a business trip request to <strong>${data.managerName}</strong> for approval.
      </p>

      <!-- Employee Info -->
      ${data.userDetails ? `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${data.userDetails.department ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 35%; font-size: 13px;">Department:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.department}</td>
          </tr>
          ` : ''}
          ${data.userDetails.employeeId ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Employee ID:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.employeeId}</td>
          </tr>
          ` : ''}
          ${data.userDetails.phone ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Phone:</td>
            <td style="padding: 6px 0; font-weight: 500; color: #1f2937; font-size: 13px;">${data.userDetails.phone}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      ` : ''}

      <!-- Trip Details -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #C00000; padding: 24px; margin: 24px 0; border-radius: 6px;">
        <h3 style="margin-top: 0; color: #C00000; font-size: 18px; font-weight: 600; margin-bottom: 16px;">Trip Details</h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; width: 35%; font-size: 14px; font-weight: 500;">From:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.departureLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">To:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.destination}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Departure:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.departureDate} at ${data.tripDetails.departureTime} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Return:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.returnDate} at ${data.tripDetails.returnTime} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
          ${data.tripDetails.vehicleType ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Vehicle Type:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${
              data.tripDetails.vehicleType === 'car-4' ? '4-Seater Car' :
              data.tripDetails.vehicleType === 'car-7' ? '7-Seater Car' :
              data.tripDetails.vehicleType === 'van-16' ? '16-Seater Van' :
              data.tripDetails.vehicleType
            }</td>
          </tr>
          ` : ''}
          ${data.tripDetails.passengerCount ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Passengers:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.passengerCount} person(s)</td>
          </tr>
          ` : ''}
          ${data.tripDetails.estimatedCost ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Estimated Cost:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #C00000; font-size: 14px;">${data.tripDetails.estimatedCost.toLocaleString('vi-VN')} VND</td>
          </tr>
          ` : ''}
          ${data.tripDetails.purpose ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Purpose:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.tripDetails.purpose}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Pickup Information -->
      ${data.userDetails && (data.userDetails.pickupAddress || data.userDetails.pickupNotes) ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; margin-bottom: 20px; border-radius: 6px;">
        <h4 style="margin: 0 0 12px 0; color: #0369a1; font-size: 14px; font-weight: 600;">Pickup Information</h4>
        ${data.userDetails.pickupAddress ? `
        <p style="margin: 4px 0; color: #374151; font-size: 13px;">
          <strong>Address:</strong> ${data.userDetails.pickupAddress}
        </p>
        ` : ''}
        ${data.userDetails.pickupNotes ? `
        <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">
          <strong>Notes:</strong> ${data.userDetails.pickupNotes}
        </p>
        ` : ''}
      </div>
      ` : ''}

      <!-- Approval Status Notice -->
      <div style="background: #fffbeb; border: 1px solid #fbbf24; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin-top: 28px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
          <strong>Approval request sent to:</strong> ${data.managerName} (${data.managerEmail})
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
          This email was sent automatically from<br>
          <strong style="color: #374151;">Trips Management System</strong><br>
          <span style="font-size: 12px; color: #9ca3af;">Intersnack Vietnam • trip.intersnack.com.vn</span>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 12px 0 0 0;">
          Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}

// ========================================
// SEND APPROVAL EMAIL
// ========================================

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  try {
    console.log(`📧 Sending approval email for trip ${data.tripId} to ${data.managerEmail}`);

    // Generate approval/reject tokens
    const approveToken = generateApprovalToken({
      tripId: data.tripId,
      managerEmail: data.managerEmail,
      action: 'approve',
    });

    const rejectToken = generateApprovalToken({
      tripId: data.tripId,
      managerEmail: data.managerEmail,
      action: 'reject',
    });

    // Create email HTML for manager (with action buttons)
    const managerEmailHTML = generateApprovalEmailHTML(data, approveToken, rejectToken);

    // Send to manager with action buttons
    const managerEmailNotification: EmailNotification = {
      to: [data.managerEmail],
      subject: data.isUrgent
        ? `⚠️ [URGENT] Business Trip Approval - ${data.userName}`
        : `Business Trip Approval - ${data.userName}`,
      html: managerEmailHTML,
      category: 'approval', // Use trip-approvals@intersnack.com.vn
    };

    await sendEmail(managerEmailNotification);
    console.log(`✅ Approval email sent to manager: ${data.managerEmail}`);

    // Send separate FYI email to CC recipients (view-only, no action buttons)
    if (data.ccEmails && data.ccEmails.length > 0) {
      const ccEmailHTML = generateCCNotificationHTML(data);

      for (const ccEmail of data.ccEmails) {
        const ccEmailNotification: EmailNotification = {
          to: [ccEmail],
          subject: data.isUrgent
            ? `⚠️ [URGENT] Business Trip Request - FYI - ${data.userName}`
            : `Business Trip Request - FYI - ${data.userName}`,
          html: ccEmailHTML,
          category: 'approval', // Use trip-approvals@intersnack.com.vn
        };

        await sendEmail(ccEmailNotification);
        console.log(`✅ FYI email sent to CC: ${ccEmail}`);
      }
    }

    console.log(`✅ All approval emails sent successfully for trip ${data.tripId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send approval email:', error);
    return false;
  }
}

// ========================================
// SEND URGENT ALERT TO ADMIN
// ========================================

export async function sendUrgentAlertToAdmin(data: ApprovalEmailData): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('⚠️ ADMIN_EMAIL not configured, skipping urgent alert');
      return false;
    }

    console.log(`🚨 Sending urgent alert to admin for trip ${data.tripId}`);

    const emailNotification: EmailNotification = {
      to: [adminEmail],
      subject: `🚨 [URGENT TRIP] ${data.userName} - Cần xử lý trong 24h`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Urgent Trip Alert</title>
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">🚨 Trip gấp cần xử lý ngay</h2>
  </div>
  <div style="background: white; border: 1px solid #e0e0e0; padding: 20px; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>${data.userName}</strong> (<a href="mailto:${data.userEmail}">${data.userEmail}</a>) đã đăng ký trip gấp (khởi hành < 24 giờ):</p>

    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Từ:</strong> ${data.tripDetails.departureLocation}</li>
        <li><strong>Đến:</strong> ${data.tripDetails.destination}</li>
        <li><strong>Khởi hành:</strong> ${data.tripDetails.departureDate} ${data.tripDetails.departureTime}</li>
        <li><strong>Trở về:</strong> ${data.tripDetails.returnDate} ${data.tripDetails.returnTime}</li>
        ${data.tripDetails.purpose ? `<li><strong>Mục đích:</strong> ${data.tripDetails.purpose}</li>` : ''}
      </ul>
    </div>

    <p style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px;">
      <strong>Email phê duyệt đã được gửi đến:</strong> <a href="mailto:${data.managerEmail}">${data.managerEmail}</a> (${data.managerName})
    </p>

    <p style="color: #666; margin-top: 20px;">Vui lòng theo dõi để đảm bảo được xử lý kịp thời.</p>
  </div>
</body>
</html>
      `,
      category: 'notification',
    };

    await sendEmail(emailNotification);
    console.log('✅ Urgent alert sent to admin');
    return true;
  } catch (error) {
    console.error('❌ Failed to send urgent alert:', error);
    return false;
  }
}

// ========================================
// SEND CONFIRMATION EMAIL TO USER
// ========================================

export async function sendConfirmationEmail(params: {
  userEmail: string;
  userName: string;
  tripDetails: any;
  status: 'approved' | 'rejected';
  managerName: string;
  rejectionReason?: string;
}): Promise<boolean> {
  try {
    console.log(`📧 Sending confirmation email to ${params.userEmail} (${params.status})`);

    const isApproved = params.status === 'approved';

    const emailNotification: EmailNotification = {
      to: [params.userEmail],
      subject: isApproved
        ? `✅ Business Trip Request Approved`
        : `❌ Business Trip Request Rejected`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isApproved ? 'Trip Request Approved' : 'Trip Request Rejected'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="background-color: ${isApproved ? '#10b981' : '#C00000'}; padding: 30px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
        ${isApproved ? '✅ Trip Request Approved' : '❌ Trip Request Rejected'}
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px;">Trips Management System • Intersnack Vietnam</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      <p style="font-size: 16px; margin-bottom: 12px; color: #111827; font-weight: 600;">
        Dear ${params.userName},
      </p>

      <p style="margin-bottom: 24px; color: #4b5563; line-height: 1.6; font-size: 14px;">
        Your business trip request has been <strong style="color: ${isApproved ? '#10b981' : '#C00000'};">${isApproved ? 'approved' : 'rejected'}</strong> by <strong>${params.managerName}</strong>.
      </p>

      ${params.rejectionReason ? `
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-left: 4px solid #C00000; padding: 16px; margin: 20px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600;">Rejection Reason:</p>
        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">${params.rejectionReason}</p>
      </div>
      ` : ''}

      <!-- Trip Details -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${isApproved ? '#10b981' : '#C00000'}; padding: 24px; margin: 24px 0; border-radius: 6px;">
        <h3 style="margin-top: 0; color: ${isApproved ? '#10b981' : '#C00000'}; font-size: 18px; font-weight: 600; margin-bottom: 16px;">Trip Details</h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; width: 35%; font-size: 14px; font-weight: 500;">From:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${params.tripDetails.departureLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">To:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${params.tripDetails.destination}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Departure:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${params.tripDetails.departureDate} at ${params.tripDetails.departureTime || 'N/A'} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Return:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${params.tripDetails.returnDate} at ${params.tripDetails.returnTime || 'N/A'} <span style="color: #6b7280; font-size: 12px; font-weight: 400;">(GMT+7)</span></td>
          </tr>
        </table>
      </div>

      ${isApproved ? `
      <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin-top: 20px;">
        <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
          ✓ You can view details and track your trip in <strong>My Trips</strong> section of the system.
        </p>
      </div>
      ` : `
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin-top: 20px;">
        <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
          If you have questions about this decision, please contact your manager directly.
        </p>
      </div>
      `}

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6;">
          This email was sent automatically from<br>
          <strong style="color: #374151;">Trips Management System</strong><br>
          <span style="font-size: 12px; color: #9ca3af;">Intersnack Vietnam • trip.intersnack.com.vn</span>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 12px 0 0 0;">
          Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>

</body>
</html>
      `,
      category: 'notification',
    };

    await sendEmail(emailNotification);
    console.log(`✅ Confirmation email sent to ${params.userEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
    return false;
  }
}

// ========================================
// NO-MANAGER NOTIFICATION (Super Admin)
// ========================================

function generateNoManagerNotificationHTML(data: NoManagerNotificationData): string {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:50001';
  const userProfileUrl = `${appUrl}/admin/users`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực nhân viên không có quản lý trực tiếp</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Professional Header -->
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⚠️ Xác thực thông tin nhân viên</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Trips Management System - Intersnack Vietnam</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">
        ⚠️ Nhân viên đăng ký không có quản lý trực tiếp
      </p>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px; color: #1f2937;">Xin chào <strong style="color: #dc2626;">Super Admin</strong>,</p>

    <p style="margin-bottom: 24px; color: #4b5563; line-height: 1.6;">
      Một nhân viên vừa hoàn thành thiết lập hồ sơ và đã chọn tùy chọn <strong>"Tôi không có quản lý trực tiếp"</strong>.
      Vui lòng xác thực thông tin nhân viên này.
    </p>

    <!-- Employee Information -->
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 16px 0; color: #991b1b; font-size: 16px; font-weight: 600;">📋 Thông tin nhân viên</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 40%;">Họ tên:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${data.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${data.userEmail}" style="color: #dc2626; text-decoration: none; font-weight: 500;">${data.userEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Số điện thoại:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.phone}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Phòng ban:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.department}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Văn phòng:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.officeLocation}</td>
        </tr>
        ${data.employeeId ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Mã nhân viên:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.employeeId}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <!-- Status Notice -->
    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">ℹ️ Tình trạng hiện tại:</p>
      <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
        • Nhân viên đã hoàn thành thiết lập hồ sơ<br>
        • Các yêu cầu đi công tác sẽ được <strong>tự động phê duyệt</strong> (không cần quản lý phê duyệt)<br>
        • Vui lòng xác thực tình trạng này có chính xác hay không
      </p>
    </div>

    <!-- Action Required -->
    <div style="background: #fff7ed; border: 1px solid #f97316; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #9a3412; font-size: 14px; font-weight: 600;">✓ Hành động cần thực hiện:</p>
      <p style="margin: 0; color: #7c2d12; font-size: 13px; line-height: 1.5;">
        1. Xác thực thông tin nhân viên<br>
        2. Nếu nhân viên có quản lý, vui lòng cập nhật thông tin quản lý trong hệ thống<br>
        3. Nếu nhân viên thuộc C-level/CEO, không cần thay đổi gì
      </p>
    </div>

    <!-- View User Profile Button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${userProfileUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
        🔍 Xem danh sách nhân viên
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">

    <!-- Footer -->
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.6;">
      Email này được gửi tự động từ <strong style="color: #6b7280;">Trips Management System</strong><br>
      <span style="font-size: 12px;">Intersnack Vietnam • trip.intersnack.com.vn</span>
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Send notification to super admin when user setup profile with "no manager"
 */
export async function sendNoManagerNotificationToAdmin(data: NoManagerNotificationData): Promise<boolean> {
  try {
    const emailHTML = generateNoManagerNotificationHTML(data);

    const emailNotification: EmailNotification = {
      to: 'ngan.ngo@intersnack.com',
      subject: '⚠️ Xác thực nhân viên không có quản lý - ' + data.userName,
      html: emailHTML,
      category: 'alert',
    };

    await sendEmail(emailNotification);
    console.log(`✅ No-manager notification sent to super admin for user: ${data.userEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send no-manager notification to admin:', error);
    return false;
  }
}
