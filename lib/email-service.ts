// lib/email-service.ts
import { Trip } from './mysql-service';
import { config, getLocationName, formatCurrency } from './config';

interface EmailNotification {
  to: string[];
  subject: string;
  body: string;
  html?: string;
}

class EmailService {
  private isConfigured: boolean = false;
  private pendingEmails: EmailNotification[] = [];

  constructor() {
    // In production, check for email service configuration
    this.isConfigured = !!process.env.EMAIL_SERVICE_URL || 
                       !!process.env.SMTP_HOST ||
                       typeof window === 'undefined'; // Allow on server
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
   */
  private async sendEmail(notification: EmailNotification): Promise<void> {
    // Store email for later processing if not configured
    if (!this.isConfigured) {
      console.log('📧 Email queued (service not configured):', notification.subject);
      this.pendingEmails.push(notification);
      return;
    }

    try {
      // In production, integrate with actual email service
      // Options: SendGrid, AWS SES, Mailgun, SMTP, etc.
      
      if (process.env.EMAIL_SERVICE_URL) {
        // Example: External email API
        const response = await fetch(process.env.EMAIL_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
          },
          body: JSON.stringify({
            to: notification.to,
            subject: notification.subject,
            text: notification.body,
            html: notification.html
          })
        });

        if (!response.ok) {
          throw new Error(`Email API error: ${response.status}`);
        }
      } else {
        // Development: Log emails to console
        console.log('📧 Email sent (dev mode):');
        console.log('To:', notification.to.join(', '));
        console.log('Subject:', notification.subject);
        console.log('Body:', notification.body.substring(0, 200) + '...');
      }
      
      // Mark trips as notified in database
      // This would be handled by the backend service
      
    } catch (error) {
      console.error('Failed to send email:', error);
      // In production, implement retry logic or queue for later
      this.pendingEmails.push(notification);
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
   * Check if email service is configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();