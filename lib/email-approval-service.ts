// lib/email-approval-service.ts
// Email service for trip approval workflow

import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

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
  };
  isUrgent: boolean;
}

export interface ApprovalToken {
  tripId: string;
  managerEmail: string;
  action: 'approve' | 'reject';
}

// ========================================
// EMAIL TRANSPORTER
// ========================================

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
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
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:50001';
  const approveUrl = `${appUrl}/api/trips/approve?token=${approveToken}`;
  const rejectUrl = `${appUrl}/api/trips/approve?token=${rejectToken}`;

  const urgentBadge = data.isUrgent
    ? '<div style="background: #dc3545; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 16px; font-weight: bold;">⚠️ URGENT - Cần phê duyệt trong 24h</div>'
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phê duyệt yêu cầu đi công tác</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Yêu cầu phê duyệt đi công tác</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">

    ${urgentBadge}

    <p style="font-size: 16px; margin-bottom: 20px;">Xin chào <strong>${data.managerName}</strong>,</p>

    <p style="margin-bottom: 20px;">
      <strong>${data.userName}</strong> (<a href="mailto:${data.userEmail}">${data.userEmail}</a>) đã gửi yêu cầu đi công tác cần sự phê duyệt của bạn.
    </p>

    <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #667eea; font-size: 18px;">Chi tiết chuyến đi</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 40%;">Từ:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.tripDetails.departureLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Đến:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.tripDetails.destination}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Khởi hành:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.tripDetails.departureDate} ${data.tripDetails.departureTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Trở về:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.tripDetails.returnDate} ${data.tripDetails.returnTime}</td>
        </tr>
        ${data.tripDetails.purpose ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Mục đích:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.tripDetails.purpose}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <p style="margin-bottom: 16px; font-weight: 500; color: #666;">Vui lòng phê duyệt hoặc từ chối yêu cầu này:</p>

      <a href="${approveUrl}" style="display: inline-block; background: #28a745; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">
        ✓ Phê duyệt
      </a>

      <a href="${rejectUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">
        ✗ Từ chối
      </a>
    </div>

    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 16px; margin-top: 24px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Lưu ý:</strong> Link phê duyệt có hiệu lực trong <strong>48 giờ</strong>. Sau thời gian này, yêu cầu sẽ được chuyển cho Admin xử lý.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

    <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
      Email này được gửi tự động từ <strong>Trips Management System</strong><br>
      Vui lòng không reply email này.
    </p>
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
    console.log(`📧 Sending approval email for trip ${data.tripId}`);

    // Generate tokens
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

    // Create email
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
      to: data.managerEmail,
      cc: data.ccEmails || [],
      subject: data.isUrgent
        ? `⚠️ [URGENT] Phê duyệt đi công tác - ${data.userName}`
        : `Phê duyệt đi công tác - ${data.userName}`,
      html: generateApprovalEmailHTML(data, approveToken, rejectToken),
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`✅ Approval email sent to ${data.managerEmail}`);
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
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
      to: 'admin@intersnack.com.vn', // Admin email
      subject: `🚨 [URGENT TRIP] ${data.userName} - Cần xử lý trong 24h`,
      html: `
        <h2>🚨 Trip gấp cần xử lý</h2>
        <p><strong>${data.userName}</strong> đã đăng ký trip gấp (< 24h):</p>
        <ul>
          <li>Từ: ${data.tripDetails.departureLocation}</li>
          <li>Đến: ${data.tripDetails.destination}</li>
          <li>Khởi hành: ${data.tripDetails.departureDate} ${data.tripDetails.departureTime}</li>
        </ul>
        <p>Email phê duyệt đã được gửi đến: ${data.managerEmail}</p>
        <p>Vui lòng theo dõi để đảm bảo được xử lý kịp thời.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Urgent alert sent to admin');
    return true;
  } catch (error) {
    console.error('❌ Failed to send urgent alert:', error);
    return false;
  }
}

// ========================================
// SEND CONFIRMATION EMAIL
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
    const transporter = createTransporter();

    const isApproved = params.status === 'approved';

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
      to: params.userEmail,
      subject: isApproved
        ? `✅ Yêu cầu đi công tác đã được phê duyệt`
        : `❌ Yêu cầu đi công tác bị từ chối`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${isApproved ? '#28a745' : '#dc3545'}">
            ${isApproved ? '✅ Yêu cầu đã được phê duyệt' : '❌ Yêu cầu bị từ chối'}
          </h2>
          <p>Xin chào <strong>${params.userName}</strong>,</p>
          <p>
            Yêu cầu đi công tác của bạn đã được <strong>${params.managerName}</strong>
            ${isApproved ? 'phê duyệt' : 'từ chối'}.
          </p>
          ${params.rejectionReason ? `<p><strong>Lý do:</strong> ${params.rejectionReason}</p>` : ''}
          <div style="background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p><strong>Chi tiết chuyến đi:</strong></p>
            <ul>
              <li>Từ: ${params.tripDetails.departureLocation}</li>
              <li>Đến: ${params.tripDetails.destination}</li>
              <li>Khởi hành: ${params.tripDetails.departureDate}</li>
            </ul>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to ${params.userEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
    return false;
  }
}
