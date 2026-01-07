// lib/manager-verification-service.ts
// Service for email-based manager verification

import crypto from 'crypto';
import { sendEmail } from './email-service';
import { graphEmailService } from './microsoft-graph-email';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface ManagerConfirmationData {
  userId: string; // Changed from number to string to match users.id VARCHAR type
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
  const subject = `🔔 Manager Confirmation Request from ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Manager Confirmation Request</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f4f6f9;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      background-color: #f4f6f9;
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }

    /* Header with modern gradient */
    .header {
      background: linear-gradient(135deg, #C00000 0%, #A00000 50%, #800000 100%);
      color: white;
      padding: 48px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 15s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.3; }
    }
    .header-icon {
      background: rgba(255, 255, 255, 0.2);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 42px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      position: relative;
      z-index: 1;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    .header p {
      font-size: 15px;
      opacity: 0.95;
      font-weight: 400;
      position: relative;
      z-index: 1;
    }

    /* Content area */
    .content {
      padding: 48px 40px;
      background-color: #ffffff;
    }
    .greeting {
      font-size: 20px;
      color: #1a1a1a;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .intro-text {
      font-size: 16px;
      color: #4a5568;
      margin-bottom: 32px;
      line-height: 1.8;
    }
    .employee-name {
      color: #C00000;
      font-weight: 700;
      font-size: 17px;
    }

    /* Employee info card with modern design */
    .info-card {
      background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
      border: 2px solid #ffcccb;
      border-radius: 12px;
      padding: 28px;
      margin: 32px 0;
      box-shadow: 0 4px 16px rgba(192, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
    }
    .info-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(180deg, #C00000 0%, #ff4444 100%);
    }
    .info-card h3 {
      color: #C00000;
      font-size: 18px;
      margin-bottom: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      padding-left: 8px;
    }
    .info-card h3::before {
      content: '👤';
      margin-right: 10px;
      font-size: 22px;
    }
    .info-row {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      margin-left: 8px;
      transition: transform 0.2s ease;
    }
    .info-row:hover {
      transform: translateX(4px);
    }
    .info-label {
      color: #718096;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }
    .info-value {
      color: #1a1a1a;
      font-size: 16px;
      font-weight: 600;
    }

    /* Responsibilities section */
    .responsibilities {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-radius: 12px;
      padding: 28px;
      margin: 32px 0;
      border: 1px solid #e2e8f0;
    }
    .responsibilities h4 {
      color: #2d3748;
      font-size: 17px;
      margin-bottom: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
    }
    .responsibilities h4::before {
      content: '📋';
      margin-right: 10px;
      font-size: 20px;
    }
    .responsibilities-intro {
      color: #718096;
      font-size: 14px;
      margin-bottom: 16px;
      font-style: italic;
    }
    .responsibilities ul {
      list-style: none;
      padding: 0;
    }
    .responsibilities li {
      padding: 12px 0 12px 36px;
      position: relative;
      color: #2d3748;
      font-size: 15px;
      line-height: 1.7;
      border-bottom: 1px solid #e2e8f0;
    }
    .responsibilities li:last-child {
      border-bottom: none;
    }
    .responsibilities li::before {
      content: '✓';
      position: absolute;
      left: 0;
      top: 12px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      color: white;
      font-weight: bold;
      font-size: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Action section with prominent CTA */
    .action-section {
      text-align: center;
      margin: 40px 0;
      padding: 40px 24px;
      background: linear-gradient(135deg, #f7fafc 0%, #ffffff 100%);
      border-radius: 12px;
      border: 2px dashed #cbd5e0;
    }
    .action-label {
      font-size: 18px;
      color: #2d3748;
      font-weight: 700;
      margin-bottom: 28px;
      display: block;
    }
    .button-container {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      padding: 18px 48px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.3px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      border: none;
      cursor: pointer;
      min-width: 160px;
    }
    .btn-confirm {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      color: white !important;
      box-shadow: 0 4px 20px rgba(39, 174, 96, 0.35);
    }
    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(39, 174, 96, 0.45);
    }
    .btn-reject {
      background: white;
      color: #e53e3e !important;
      border: 2px solid #e53e3e;
      box-shadow: 0 4px 16px rgba(229, 62, 62, 0.2);
    }
    .btn-reject:hover {
      background: #e53e3e;
      color: white !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(229, 62, 62, 0.4);
    }

    /* Notice box */
    .notice-box {
      background: linear-gradient(135deg, #fffaf0 0%, #fef5e7 100%);
      border-left: 6px solid #f39c12;
      border-radius: 12px;
      padding: 24px 28px;
      margin: 32px 0;
      box-shadow: 0 2px 12px rgba(243, 156, 18, 0.1);
    }
    .notice-box-title {
      color: #d68910;
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    .notice-box-title::before {
      content: '⚠️';
      margin-right: 10px;
      font-size: 22px;
    }
    .notice-box ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .notice-box li {
      padding: 10px 0 10px 28px;
      color: #7d6608;
      font-size: 14px;
      position: relative;
      line-height: 1.6;
    }
    .notice-box li::before {
      content: '●';
      position: absolute;
      left: 8px;
      color: #f39c12;
      font-weight: bold;
      font-size: 16px;
    }
    .notice-box strong {
      color: #c27803;
      font-weight: 700;
    }

    /* Footer */
    .footer {
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      color: #e2e8f0;
      padding: 32px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 14px;
      margin: 8px 0;
      opacity: 0.95;
    }
    .footer-divider {
      height: 1px;
      background: rgba(255,255,255,0.15);
      margin: 16px auto;
      max-width: 80%;
    }
    .company-name {
      color: #ffffff;
      font-weight: 700;
    }
    .footer-copyright {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 12px;
      color: #a0aec0;
    }

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 12px; }
      .content { padding: 32px 24px; }
      .header { padding: 36px 24px; }
      .header h1 { font-size: 24px; }
      .header-icon { width: 64px; height: 64px; font-size: 32px; }
      .button-container { flex-direction: column; gap: 12px; }
      .btn {
        display: block;
        width: 100%;
        padding: 16px 24px;
        margin: 0;
      }
      .info-card, .responsibilities, .notice-box { padding: 20px; }
      .action-section { padding: 28px 20px; }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: #1a1a1a; }
      .container { background-color: #2d2d2d; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
      .content { background-color: #2d2d2d; }
      .greeting { color: #f0f0f0; }
      .intro-text { color: #c0c0c0; }
      .info-row { background: #3a3a3a; }
      .info-value { color: #f0f0f0; }
      .responsibilities { background: linear-gradient(135deg, #3a3a3a 0%, #2d2d2d 100%); }
      .responsibilities li { color: #e0e0e0; border-bottom-color: #4a4a4a; }
      .action-section { background: linear-gradient(135deg, #3a3a3a 0%, #2d2d2d 100%); border-color: #4a4a4a; }
      .action-label { color: #f0f0f0; }
      .btn-reject { background: #3a3a3a; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <!-- Header Section -->
      <div class="header">
        <div class="header-icon">✋</div>
        <h1>Manager Confirmation Required</h1>
        <p>Trips Management System • Intersnack Vietnam</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Dear Manager,</div>

        <p class="intro-text">
          <span class="employee-name">${data.userName}</span> has designated you as their direct reporting manager in the Trips Management System.
          Your confirmation is required to activate their account and enable trip request submissions.
        </p>

        <!-- Employee Information Card -->
        <div class="info-card">
          <h3>Employee Information</h3>
          <div class="info-row">
            <span class="info-label">Full Name</span>
            <div class="info-value">${data.userName}</div>
          </div>
          <div class="info-row">
            <span class="info-label">Email Address</span>
            <div class="info-value">${data.userEmail}</div>
          </div>
        </div>

        <!-- Responsibilities Section -->
        <div class="responsibilities">
          <h4>Your Responsibilities</h4>
          <p class="responsibilities-intro">By confirming this manager-employee relationship, you agree to:</p>
          <ul>
            <li>Review and approve or reject business trip requests submitted by this employee</li>
            <li>Receive email notifications when trip approvals are pending</li>
            <li>Be listed as the official reporting manager for this employee in the system</li>
          </ul>
        </div>

        <!-- Call to Action -->
        <div class="action-section">
          <span class="action-label">Please respond to this request</span>
          <div class="button-container">
            <a href="${data.confirmUrl}" class="btn btn-confirm">✓ Confirm & Approve</a>
            <a href="${data.rejectUrl}" class="btn btn-reject">✗ Decline Request</a>
          </div>
        </div>

        <!-- Important Notice -->
        <div class="notice-box">
          <div class="notice-box-title">Important Information</div>
          <ul>
            <li>This confirmation link expires on <strong>${data.expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
            <li>Only confirm if you are <strong>indeed this employee's direct manager</strong></li>
            <li>If you did not expect this request or believe it's incorrect, please <strong>decline it</strong> and contact HR immediately</li>
            <li>One-click action required - no login necessary</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>This is an automated notification from <span class="company-name">Trips Management System</span></p>
        <div class="footer-divider"></div>
        <p>Need help? Contact your HR department or IT support</p>
        <p class="footer-copyright">© ${new Date().getFullYear()} Intersnack Vietnam. All rights reserved.</p>
      </div>
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
  const subject = `🔄 Manager Change Request from ${data.userName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Manager Change Request</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f4f6f9;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      background-color: #f4f6f9;
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }

    /* Header with orange accent for change request */
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%);
      color: white;
      padding: 48px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 15s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.3; }
    }
    .header-icon {
      background: rgba(255, 255, 255, 0.2);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 42px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      position: relative;
      z-index: 1;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    .header p {
      font-size: 15px;
      opacity: 0.95;
      font-weight: 400;
      position: relative;
      z-index: 1;
    }

    /* Content area */
    .content {
      padding: 48px 40px;
      background-color: #ffffff;
    }
    .greeting {
      font-size: 20px;
      color: #1a1a1a;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .intro-text {
      font-size: 16px;
      color: #4a5568;
      margin-bottom: 32px;
      line-height: 1.8;
    }
    .employee-name {
      color: #ea580c;
      font-weight: 700;
      font-size: 17px;
    }

    /* Change notice - highlighted orange box */
    .change-notice {
      background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
      border: 2px solid #fdba74;
      border-radius: 12px;
      padding: 28px;
      margin: 32px 0;
      box-shadow: 0 4px 16px rgba(234, 88, 12, 0.12);
      position: relative;
      overflow: hidden;
    }
    .change-notice::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(180deg, #ea580c 0%, #fb923c 100%);
    }
    .change-notice h3 {
      color: #9a3412;
      font-size: 18px;
      margin-bottom: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      padding-left: 8px;
    }
    .change-notice h3::before {
      content: '🔄';
      margin-right: 10px;
      font-size: 22px;
    }
    .change-row {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      margin-left: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .change-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .change-label {
      color: #718096;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }
    .change-value {
      color: #1a1a1a;
      font-size: 15px;
      font-weight: 600;
    }
    .change-highlight {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 4px 12px;
      border-radius: 6px;
      display: inline-block;
      font-weight: 700;
    }
    .reason-box {
      background: #fffbeb;
      border-left: 3px solid #ea580c;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0 0 8px;
      font-style: italic;
      color: #92400e;
    }

    /* Employee info card */
    .info-card {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 28px;
      margin: 32px 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }
    .info-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(180deg, #6b7280 0%, #9ca3af 100%);
    }
    .info-card h3 {
      color: #374151;
      font-size: 18px;
      margin-bottom: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      padding-left: 8px;
    }
    .info-card h3::before {
      content: '👤';
      margin-right: 10px;
      font-size: 22px;
    }
    .info-row {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      margin-left: 8px;
      transition: transform 0.2s ease;
    }
    .info-row:hover {
      transform: translateX(4px);
    }
    .info-label {
      color: #718096;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }
    .info-value {
      color: #1a1a1a;
      font-size: 16px;
      font-weight: 600;
    }

    /* Impact section */
    .impact-section {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-radius: 12px;
      padding: 28px;
      margin: 32px 0;
      border: 1px solid #bbf7d0;
    }
    .impact-section h4 {
      color: #166534;
      font-size: 17px;
      margin-bottom: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
    }
    .impact-section h4::before {
      content: '📊';
      margin-right: 10px;
      font-size: 20px;
    }
    .impact-section ul {
      list-style: none;
      padding: 0;
    }
    .impact-section li {
      padding: 12px 0 12px 36px;
      position: relative;
      color: #166534;
      font-size: 15px;
      line-height: 1.7;
      border-bottom: 1px solid #bbf7d0;
    }
    .impact-section li:last-child {
      border-bottom: none;
    }
    .impact-section li::before {
      content: '→';
      position: absolute;
      left: 0;
      top: 12px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      color: white;
      font-weight: bold;
      font-size: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Action section */
    .action-section {
      text-align: center;
      margin: 40px 0;
      padding: 40px 24px;
      background: linear-gradient(135deg, #f7fafc 0%, #ffffff 100%);
      border-radius: 12px;
      border: 2px dashed #cbd5e0;
    }
    .action-label {
      font-size: 18px;
      color: #2d3748;
      font-weight: 700;
      margin-bottom: 28px;
      display: block;
    }
    .button-container {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-block;
      padding: 18px 48px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.3px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      border: none;
      cursor: pointer;
      min-width: 160px;
    }
    .btn-confirm {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      color: white !important;
      box-shadow: 0 4px 20px rgba(39, 174, 96, 0.35);
    }
    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(39, 174, 96, 0.45);
    }
    .btn-reject {
      background: white;
      color: #e53e3e !important;
      border: 2px solid #e53e3e;
      box-shadow: 0 4px 16px rgba(229, 62, 62, 0.2);
    }
    .btn-reject:hover {
      background: #e53e3e;
      color: white !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(229, 62, 62, 0.4);
    }

    /* Notice box */
    .notice-box {
      background: linear-gradient(135deg, #fffaf0 0%, #fef5e7 100%);
      border-left: 6px solid #f39c12;
      border-radius: 12px;
      padding: 24px 28px;
      margin: 32px 0;
      box-shadow: 0 2px 12px rgba(243, 156, 18, 0.1);
    }
    .notice-box-title {
      color: #d68910;
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    .notice-box-title::before {
      content: '⚠️';
      margin-right: 10px;
      font-size: 22px;
    }
    .notice-box ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .notice-box li {
      padding: 10px 0 10px 28px;
      color: #7d6608;
      font-size: 14px;
      position: relative;
      line-height: 1.6;
    }
    .notice-box li::before {
      content: '●';
      position: absolute;
      left: 8px;
      color: #f39c12;
      font-weight: bold;
      font-size: 16px;
    }
    .notice-box strong {
      color: #c27803;
      font-weight: 700;
    }

    /* Footer */
    .footer {
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      color: #e2e8f0;
      padding: 32px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 14px;
      margin: 8px 0;
      opacity: 0.95;
    }
    .footer-divider {
      height: 1px;
      background: rgba(255,255,255,0.15);
      margin: 16px auto;
      max-width: 80%;
    }
    .company-name {
      color: #ffffff;
      font-weight: 700;
    }
    .footer-copyright {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 12px;
      color: #a0aec0;
    }

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 12px; }
      .content { padding: 32px 24px; }
      .header { padding: 36px 24px; }
      .header h1 { font-size: 24px; }
      .header-icon { width: 64px; height: 64px; font-size: 32px; }
      .button-container { flex-direction: column; gap: 12px; }
      .btn {
        display: block;
        width: 100%;
        padding: 16px 24px;
        margin: 0;
      }
      .info-card, .change-notice, .impact-section, .notice-box { padding: 20px; }
      .action-section { padding: 28px 20px; }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: #1a1a1a; }
      .container { background-color: #2d2d2d; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
      .content { background-color: #2d2d2d; }
      .greeting { color: #f0f0f0; }
      .intro-text { color: #c0c0c0; }
      .info-row, .change-row { background: #3a3a3a; }
      .info-value, .change-value { color: #f0f0f0; }
      .impact-section { background: linear-gradient(135deg, #1f3a1f 0%, #2d2d2d 100%); }
      .impact-section li { color: #a0d0a0; border-bottom-color: #4a4a4a; }
      .action-section { background: linear-gradient(135deg, #3a3a3a 0%, #2d2d2d 100%); border-color: #4a4a4a; }
      .action-label { color: #f0f0f0; }
      .btn-reject { background: #3a3a3a; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <!-- Header Section -->
      <div class="header">
        <div class="header-icon">🔄</div>
        <h1>Manager Change Request</h1>
        <p>Trips Management System • Intersnack Vietnam</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="greeting">Dear Manager,</div>

        <p class="intro-text">
          <span class="employee-name">${data.userName}</span> has submitted a request to change their reporting manager to you.
          Your confirmation is required to complete this organizational change.
        </p>

        <!-- Change Details Card -->
        <div class="change-notice">
          <h3>Manager Change Details</h3>
          <div class="change-row">
            <span class="change-icon">📤</span>
            <div style="flex: 1;">
              <span class="change-label">Previous Manager</span>
              <div class="change-value">${data.oldManagerEmail || 'None (Initial Setup)'}</div>
            </div>
          </div>
          <div class="change-row">
            <span class="change-icon">📥</span>
            <div style="flex: 1;">
              <span class="change-label">New Manager</span>
              <div class="change-value">
                ${data.managerEmail} <span class="change-highlight">(You)</span>
              </div>
            </div>
          </div>
          ${data.reason ? `
          <div class="reason-box">
            <strong>📝 Reason for Change:</strong><br>
            "${data.reason}"
          </div>
          ` : ''}
        </div>

        <!-- Employee Information Card -->
        <div class="info-card">
          <h3>Employee Information</h3>
          <div class="info-row">
            <span class="info-label">Full Name</span>
            <div class="info-value">${data.userName}</div>
          </div>
          <div class="info-row">
            <span class="info-label">Email Address</span>
            <div class="info-value">${data.userEmail}</div>
          </div>
        </div>

        <!-- Impact Section -->
        <div class="impact-section">
          <h4>What happens if you confirm?</h4>
          <ul>
            <li>You will become the official reporting manager for <strong>${data.userName}</strong></li>
            <li>All future trip requests will require your approval</li>
            <li>You will receive email notifications for pending approvals</li>
            <li>The previous manager will be notified of this change</li>
          </ul>
        </div>

        <!-- Call to Action -->
        <div class="action-section">
          <span class="action-label">Please respond to this request</span>
          <div class="button-container">
            <a href="${data.confirmUrl}" class="btn btn-confirm">✓ Confirm & Accept</a>
            <a href="${data.rejectUrl}" class="btn btn-reject">✗ Decline Request</a>
          </div>
        </div>

        <!-- Important Notice -->
        <div class="notice-box">
          <div class="notice-box-title">Important Information</div>
          <ul>
            <li>This confirmation link expires on <strong>${data.expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
            <li>Only confirm if you are <strong>indeed this employee's new direct manager</strong></li>
            <li>If this change seems incorrect or unexpected, please <strong>decline it</strong> and contact HR</li>
            <li>One-click action required - no login necessary</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>This is an automated notification from <span class="company-name">Trips Management System</span></p>
        <div class="footer-divider"></div>
        <p>Need help? Contact your HR department or IT support</p>
        <p class="footer-copyright">© ${new Date().getFullYear()} Intersnack Vietnam. All rights reserved.</p>
      </div>
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
       JOIN users u ON CAST(mc.user_id AS CHAR) = CAST(u.id AS CHAR)
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
      // Get manager's name from users table (if manager is also a user)
      const [managerRows] = await connection.query(
        `SELECT name FROM users WHERE email = ?`,
        [confirmation.manager_email]
      );
      const managerUsers = managerRows as any[];
      const managerName = managerUsers.length > 0 ? managerUsers[0].name : null;

      // Update user's manager (set both email AND name)
      await connection.query(
        `UPDATE users
         SET manager_email = ?,
             manager_name = ?,
             manager_confirmed = TRUE,
             manager_confirmed_at = NOW(),
             pending_manager_email = NULL,
             manager_change_requested_at = NULL
         WHERE id = ?`,
        [confirmation.manager_email, managerName, confirmation.user_id]
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
