// lib/email-service.ts
import { Trip } from './mysql-service';
import { config, getLocationName, formatCurrency } from './config';
import { graphEmailService } from './microsoft-graph-email';

export interface EmailNotification {
  to: string | string[];
  cc?: string[];
  subject: string;
  body?: string;
  text?: string;
  html?: string;
  category?: 'notification' | 'approval' | 'alert';
}

class EmailService {
  private isConfigured: boolean = false;
  private pendingEmails: EmailNotification[] = [];

  constructor() {
    // Check if Microsoft Graph API is configured
    this.isConfigured = graphEmailService.isConfigured() ||
                       !!process.env.EMAIL_SERVICE_URL ||
                       !!process.env.SMTP_HOST ||
                       typeof window === 'undefined'; // Allow on server
  }

  /**
   * Send trip confirmation notification
   */
  async sendTripConfirmation(trip: Trip): Promise<void> {
    if (!trip.userEmail) {
      console.warn('No email address for trip confirmation');
      return;
    }

    const subject = 'Trip Registration Confirmed';
    
    const body = `
Dear ${trip.userName || 'Employee'},

Your trip registration has been confirmed!

Trip Details:
• From: ${getLocationName(trip.departureLocation || '')}
• To: ${getLocationName(trip.destination || '')}
• Departure: ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}
• Return: ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}
${trip.vehicleType ? `• Vehicle: ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}` : ''}
${trip.estimatedCost ? `• Estimated Cost: ${formatCurrency(trip.estimatedCost)}` : ''}

If you have any questions or need to make changes, please contact the admin team.

Best regards,
Intersnack Trips Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .trip-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .highlight { color: #10b981; font-weight: bold; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Trip Registration Confirmed</h2>
    </div>
    <div class="content">
      <p>Dear ${trip.userName || 'Employee'},</p>
      
      <p>Your trip registration has been confirmed!</p>
      
      <div class="trip-details">
        <h3>Trip Details:</h3>
        <p><strong>From:</strong> ${getLocationName(trip.departureLocation || '')}</p>
        <p><strong>To:</strong> ${getLocationName(trip.destination || '')}</p>
        <p><strong>Departure:</strong> ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}</p>
        <p><strong>Return:</strong> ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}</p>
        ${trip.vehicleType ? `<p><strong>Vehicle:</strong> ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</p>` : ''}
        ${trip.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${formatCurrency(trip.estimatedCost)}</p>` : ''}
      </div>
      
      <p>If you have any questions or need to make changes, please contact the admin team.</p>
      
      <div class="footer">
        <p>Best regards,<br/>Intersnack Trips Management Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: [trip.userEmail],
      subject,
      body,
      html
    });
  }

  /**
   * Send trip approval notification
   */
  async sendApprovalNotification(trip: Trip): Promise<void> {
    if (!trip.userEmail) {
      console.warn('No email address for trip approval');
      return;
    }

    const subject = 'Trip Approved';
    
    const body = `
Dear ${trip.userName || 'Employee'},

Your trip has been approved by the admin team!

Trip Details:
• From: ${getLocationName(trip.departureLocation || '')}
• To: ${getLocationName(trip.destination || '')}
• Departure: ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}
• Return: ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}
${trip.vehicleType ? `• Vehicle: ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}` : ''}
${trip.estimatedCost ? `• Estimated Cost: ${formatCurrency(trip.estimatedCost)}` : ''}

Status: ${trip.status}

You can now proceed with your travel arrangements.

Best regards,
Intersnack Trips Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .trip-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .highlight { color: #10b981; font-weight: bold; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    .status-badge { display: inline-block; padding: 4px 12px; background-color: #10b981; color: white; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✓ Trip Approved</h2>
    </div>
    <div class="content">
      <p>Dear ${trip.userName || 'Employee'},</p>
      
      <p>Your trip has been approved by the admin team!</p>
      
      <div class="trip-details">
        <h3>Trip Details:</h3>
        <p><strong>From:</strong> ${getLocationName(trip.departureLocation || '')}</p>
        <p><strong>To:</strong> ${getLocationName(trip.destination || '')}</p>
        <p><strong>Departure:</strong> ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}</p>
        <p><strong>Return:</strong> ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}</p>
        ${trip.vehicleType ? `<p><strong>Vehicle:</strong> ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</p>` : ''}
        ${trip.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${formatCurrency(trip.estimatedCost)}</p>` : ''}
        <p><strong>Status:</strong> <span class="status-badge">${trip.status}</span></p>
      </div>
      
      <p>You can now proceed with your travel arrangements.</p>
      
      <div class="footer">
        <p>Best regards,<br/>Intersnack Trips Management Team</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: [trip.userEmail],
      subject,
      body,
      html
    });
  }

  /**
   * Send optimization notification to affected employees
   */
  async sendOptimizationNotification(
    trips: Trip[],
    proposedDepartureTime: string,
    vehicleType: string,
    estimatedSavings: number
  ): Promise<void> {
    if (!trips || trips.length === 0) {
      console.warn('No trips to notify about');
      return;
    }

    // Group trips by user email
    const tripsByUser = new Map<string, Trip[]>();
    trips.forEach(trip => {
      if (trip.userEmail) {
        if (!tripsByUser.has(trip.userEmail)) {
          tripsByUser.set(trip.userEmail, []);
        }
        tripsByUser.get(trip.userEmail)?.push(trip);
      }
    });

    // Send email to each affected user
    for (const [email, userTrips] of tripsByUser) {
      const subject = 'Your Trip Has Been Optimized';
      
      const tripDetails = userTrips.map(trip => {
        const from = getLocationName(trip.departureLocation || '');
        const to = getLocationName(trip.destination || '');
        const date = new Date(trip.departureDate).toLocaleDateString();
        const originalTime = trip.originalDepartureTime || trip.departureTime;
        
        return `
          • Route: ${from} → ${to}
          • Date: ${date}
          • Original Time: ${originalTime}
          • New Time: ${proposedDepartureTime}
        `;
      }).join('\n');

      const vehicleInfo = config.vehicles[vehicleType as keyof typeof config.vehicles]?.name || vehicleType;
      
      const body = `
Dear ${userTrips[0].userName || 'Employee'},

Your upcoming trip(s) have been optimized for cost efficiency. Here are the details:

${tripDetails}

Vehicle Type: ${vehicleInfo}
Estimated Company Savings: ${formatCurrency(estimatedSavings)}

Please note the updated departure time. If you have any concerns or conflicts with the new schedule, please contact the admin team immediately.

Best regards,
Intersnack Trips Management Team
      `.trim();

      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .trip-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .highlight { color: #2563eb; font-weight: bold; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your Trip Has Been Optimized</h2>
    </div>
    <div class="content">
      <p>Dear ${userTrips[0].userName || 'Employee'},</p>
      
      <p>Your upcoming trip(s) have been optimized for cost efficiency. Here are the details:</p>
      
      ${userTrips.map(trip => `
        <div class="trip-details">
          <p><strong>Route:</strong> ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}</p>
          <p><strong>Date:</strong> ${new Date(trip.departureDate).toLocaleDateString()}</p>
          <p><strong>Original Time:</strong> ${trip.originalDepartureTime || trip.departureTime}</p>
          <p class="highlight"><strong>New Time:</strong> ${proposedDepartureTime}</p>
        </div>
      `).join('')}
      
      <div class="trip-details">
        <p><strong>Vehicle Type:</strong> ${vehicleInfo}</p>
        <p><strong>Estimated Company Savings:</strong> ${formatCurrency(estimatedSavings)}</p>
      </div>
      
      <p>Please note the updated departure time. If you have any concerns or conflicts with the new schedule, please contact the admin team immediately.</p>
      
      <div class="footer">
        <p>Best regards,<br/>Intersnack Trips Management Team</p>
      </div>
    </div>
  </div>
</body>
</html>
      `.trim();

      await this.sendEmail({
        to: [email],
        subject,
        body,
        html
      });
    }

    // Also send summary to admins
    await this.sendAdminNotification(trips, proposedDepartureTime, vehicleType, estimatedSavings);
  }

  /**
   * Send summary notification to admin team
   */
  private async sendAdminNotification(
    trips: Trip[],
    proposedDepartureTime: string,
    vehicleType: string,
    estimatedSavings: number
  ): Promise<void> {
    const adminEmails = config.adminEmails || [];
    
    if (adminEmails.length === 0) {
      console.warn('No admin emails configured');
      return;
    }

    const subject = `Trip Optimization Approved - ${trips.length} Trips Combined`;
    
    const tripList = trips.map(trip => {
      return `• ${trip.userName} (${trip.userEmail}): ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}`;
    }).join('\n');

    const body = `
Trip Optimization Summary
========================

Number of Trips Combined: ${trips.length}
Departure Date: ${new Date(trips[0].departureDate).toLocaleDateString()}
New Departure Time: ${proposedDepartureTime}
Vehicle Type: ${config.vehicles[vehicleType as keyof typeof config.vehicles]?.name || vehicleType}
Estimated Savings: ${formatCurrency(estimatedSavings)}

Affected Employees:
${tripList}

All affected employees have been notified via email.

--
Intersnack Trips Management System
    `.trim();

    await this.sendEmail({
      to: adminEmails,
      subject,
      body
    });
  }

  /**
   * Send trip cancellation notification
   */
  async sendCancellationNotification(trip: Trip): Promise<void> {
    if (!trip.userEmail) {
      console.warn('No email address for trip cancellation');
      return;
    }

    const subject = 'Trip Cancellation Notice';
    const body = `
Dear ${trip.userName || 'Employee'},

Your trip scheduled for ${new Date(trip.departureDate).toLocaleDateString()} from ${getLocationName(trip.departureLocation || '')} to ${getLocationName(trip.destination || '')} has been cancelled.

If you have any questions, please contact the admin team.

Best regards,
Intersnack Trips Management Team
    `.trim();

    await this.sendEmail({
      to: [trip.userEmail],
      subject,
      body
    });
  }

  /**
   * Core email sending function
   * Priority: Microsoft Graph API > Custom API > SMTP > Dev Mode
   */
  async sendEmail(notification: EmailNotification): Promise<void> {
    // Store email for later processing if not configured
    if (!this.isConfigured) {
      console.log('📧 Email queued (service not configured):', notification.subject);
      this.pendingEmails.push(notification);
      return;
    }

    try {
      // Normalize to array
      const toArray = Array.isArray(notification.to) ? notification.to : [notification.to];
      const bodyText = notification.text || notification.body || '';

      // Priority 1: Microsoft Graph API (Production)
      if (graphEmailService.isConfigured()) {
        // Determine sender based on category
        // - 'approval' -> 'approvals' uses trip-approvals@intersnack.com.vn (official approval emails)
        // - 'notification' | 'alert' -> 'no-reply' uses no-reply.trips@intersnack.com.vn (general notifications)
        const senderType = notification.category === 'approval' ? 'approvals' : 'no-reply';

        await graphEmailService.sendEmail({
          to: toArray,
          cc: notification.cc,
          subject: notification.subject,
          html: notification.html || `<pre>${bodyText}</pre>`,
          text: bodyText,
          from: senderType
        });

        console.log(`✅ Email sent via Microsoft Graph API (from: ${senderType})`);
        return;
      }

      // Priority 2: Custom Email API
      if (process.env.EMAIL_SERVICE_URL) {
        const response = await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            to: toArray,
            cc: notification.cc || [],
            subject: notification.subject,
            text: bodyText,
            html: notification.html
          })
        });

        if (!response.ok) {
          throw new Error(`Email API error: ${response.status}`);
        }

        console.log('✅ Email sent via custom API');
        return;
      }

      // Priority 3: Development mode - Log to console
      console.log('📧 Email sent (dev mode):');
      console.log('To:', toArray.join(', '));
      if (notification.cc && notification.cc.length > 0) {
        console.log('CC:', notification.cc.join(', '));
      }
      console.log('Subject:', notification.subject);
      console.log('Body:', bodyText.substring(0, 200) + '...');

    } catch (error) {
      console.error('Failed to send email:', error);
      // In production, implement retry logic or queue for later
      this.pendingEmails.push(notification);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Get pending emails (for debugging/monitoring)
   */
  getPendingEmails(): EmailNotification[] {
    return this.pendingEmails;
  }

  /**
   * Retry sending pending emails
   */
  async retryPendingEmails(): Promise<void> {
    const pending = [...this.pendingEmails];
    this.pendingEmails = [];
    
    for (const email of pending) {
      await this.sendEmail(email);
    }
  }

  /**
   * Send manager approval email for joined trips
   */
  async sendManagerApprovalEmail(trip: Trip, managerEmail: string, managerName: string): Promise<void> {
    if (!managerEmail) {
      console.warn('No manager email provided');
      return;
    }

    // Generate approval token (will be handled by trips/approve API)
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:50001';
    const approvalUrl = `${appUrl}/api/trips/approve/${trip.id}?action=approve`;
    const rejectUrl = `${appUrl}/api/trips/approve/${trip.id}?action=reject`;

    const subject = `[ACTION REQUIRED] Trip Approval Request - ${trip.userName}`;

    const body = `
Dear ${managerName},

${trip.userName} (${trip.userEmail}) has joined an existing trip and requires your approval.

This trip was created when ${trip.userName} joined another employee's trip through the join request system.

Trip Details:
• Employee: ${trip.userName} (${trip.userEmail})
• From: ${getLocationName(trip.departureLocation || '')}
• To: ${getLocationName(trip.destination || '')}
• Departure: ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}
• Return: ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}
${trip.vehicleType ? `• Vehicle: ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}` : ''}
${trip.estimatedCost ? `• Estimated Cost: ${formatCurrency(trip.estimatedCost)}` : ''}

ACTION REQUIRED:
Please review and approve or reject this trip request.

Click to approve: ${approvalUrl}
Click to reject: ${rejectUrl}

This approval link will expire in 48 hours.

Best regards,
Trips Management System
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Trip Approval Request</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Action Required</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dear <strong>${managerName}</strong>,
      </p>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${trip.userName}</strong> has joined an existing trip and requires your approval.
      </p>

      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>📌 Note:</strong> This trip was created when ${trip.userName} joined another employee's trip through the join request system.
        </p>
      </div>

      <!-- Trip Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
          Trip Details
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Employee:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${trip.userName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Email:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${trip.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>From:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${getLocationName(trip.departureLocation || '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>To:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${getLocationName(trip.destination || '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Departure:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Return:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}</td>
          </tr>
          ${trip.vehicleType ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Vehicle:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</td>
          </tr>
          ` : ''}
          ${trip.estimatedCost ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Estimated Cost:</strong></td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${formatCurrency(trip.estimatedCost)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 20px 0;">
          Please review and take action:
        </p>

        <a href="${approvalUrl}"
           style="display: inline-block; background: #28a745; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px 10px 8px; font-size: 16px;">
          ✅ Approve Trip
        </a>

        <a href="${rejectUrl}"
           style="display: inline-block; background: #dc3545; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 8px 10px 8px; font-size: 16px;">
          ❌ Reject Trip
        </a>
      </div>

      <!-- Expiry Notice -->
      <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #e65100; font-size: 13px;">
          ⏰ <strong>Important:</strong> This approval link will expire in 48 hours.
        </p>
      </div>

      <p style="color: #999; font-size: 12px; margin: 30px 0 0 0; line-height: 1.6;">
        Best regards,<br>
        <strong>Trips Management System</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
      <p style="color: #6c757d; font-size: 12px; margin: 0;">
        This is an automated message from Trips Management System. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
`;

    await this.sendEmail({
      to: managerEmail,
      cc: [trip.userEmail], // CC user
      subject,
      text: body,
      html,
      category: 'approval'
    });

    console.log(`✅ Manager approval email sent to ${managerEmail} for joined trip ${trip.id}`);
  }

  /**
   * Check if email service is configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();

/**
 * Helper function to send generic email
 */
export async function sendEmail(params: EmailNotification): Promise<void> {
  return emailService.sendEmail(params);
}