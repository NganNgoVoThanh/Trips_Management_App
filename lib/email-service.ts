// lib/email-service.ts
import { Trip } from './mysql-service';
import { config, getLocationName, formatCurrency } from './config';

export interface EmailTemplate {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Simple email data structure
export interface EmailData {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private apiEndpoint: string;
  
  constructor() {
    // In production, use actual email service (SendGrid, AWS SES, etc.)
    this.apiEndpoint = process.env.EMAIL_API_URL || '';
  }

  // PUBLIC method - can be called from anywhere
  async sendEmail(data: EmailData | EmailTemplate): Promise<void> {
    try {
      if (!this.apiEndpoint) {
        // Log email in development
        console.log('📧 Email (dev mode):', {
          to: data.to,
          subject: data.subject,
          text: 'text' in data ? data.text : 'HTML email'
        });
        return;
      }

      // Ensure 'to' is always an array
      const toArray = Array.isArray(data.to) ? data.to : [data.to];

      // Send via email API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_API_KEY || ''}`
        },
        body: JSON.stringify({
          ...data,
          to: toArray
        })
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }
      
      console.log('✅ Email sent successfully to:', toArray.join(', '));
    } catch (error) {
      console.error('❌ Error sending email:', error);
      // In production, could queue for retry or log to monitoring service
    }
  }

  // Send trip confirmation email
  async sendTripConfirmation(trip: Trip): Promise<void> {
    const template = this.createTripConfirmationTemplate(trip);
    await this.sendEmail(template);
  }

  // Send optimization notification
  async sendOptimizationNotification(
    trips: Trip[], 
    newDepartureTime: string,
    vehicleType: string,
    estimatedSavings: number
  ): Promise<void> {
    const emails = trips.map(t => t.userEmail).filter(Boolean);
    if (emails.length === 0) return;
    
    const template = this.createOptimizationTemplate(trips, newDepartureTime, vehicleType, estimatedSavings);
    await this.sendEmail({
      to: emails,
      subject: template.subject,
      text: template.text || '',
      html: template.html
    });
  }

  // Send trip cancellation notification
  async sendCancellationNotification(trip: Trip): Promise<void> {
    const template = this.createCancellationTemplate(trip);
    await this.sendEmail(template);
  }

  // Send approval notification
  async sendApprovalNotification(trip: Trip): Promise<void> {
    const template = this.createApprovalTemplate(trip);
    await this.sendEmail(template);
  }

  // Send bulk emails with rate limiting
  async sendBulkEmails(templates: EmailTemplate[], delayMs: number = 100): Promise<void> {
    for (const template of templates) {
      await this.sendEmail(template);
      // Rate limiting to avoid overwhelming email service
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Create trip confirmation email template
  private createTripConfirmationTemplate(trip: Trip): EmailTemplate {
    const departureLocation = getLocationName(trip.departureLocation);
    const destination = getLocationName(trip.destination);
    const estimatedCost = trip.estimatedCost ? formatCurrency(trip.estimatedCost) : 'TBD';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚗 Trip Confirmed</h1>
          </div>
          
          <div class="content">
            <h2>Trip Details</h2>
            <p><strong>From:</strong> ${departureLocation}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Departure:</strong> ${trip.departureDate} at ${trip.departureTime}</p>
            ${trip.returnDate ? `<p><strong>Return:</strong> ${trip.returnDate} at ${trip.returnTime || 'TBD'}</p>` : ''}
            <p><strong>Estimated Cost:</strong> ${estimatedCost}</p>
            ${trip.vehicleType ? `<p><strong>Vehicle:</strong> ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</p>` : ''}
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
          </center>
          
          <div class="footer">
            <p>This is an automated email from Trips Management System.</p>
            <p>For support, contact: support@company.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: trip.userEmail,
      subject: `✅ Trip Confirmed - ${trip.id}`,
      html,
      text: `Your trip from ${departureLocation} to ${destination} on ${trip.departureDate} has been confirmed.`
    };
  }

  // Create optimization notification template
  private createOptimizationTemplate(
    trips: Trip[],
    newDepartureTime: string,
    vehicleType: string,
    estimatedSavings: number
  ): EmailTemplate {
    const tripCount = trips.length;
    const departureLocation = trips[0] ? getLocationName(trips[0].departureLocation) : 'Unknown';
    const destination = trips[0] ? getLocationName(trips[0].destination) : 'Unknown';
    const savings = formatCurrency(estimatedSavings);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
          .highlight { background: #DEF7EC; padding: 15px; border-left: 4px solid #10B981; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Trip Optimized!</h1>
          </div>
          
          <div class="content">
            <p>Good news! Your trip has been combined with ${tripCount - 1} other trip(s) to save costs.</p>
            
            <div class="highlight">
              <h3>Optimization Details</h3>
              <p><strong>Route:</strong> ${departureLocation} → ${destination}</p>
              <p><strong>New Departure Time:</strong> ${newDepartureTime}</p>
              <p><strong>Vehicle:</strong> ${config.vehicles[vehicleType as keyof typeof config.vehicles]?.name || vehicleType}</p>
              <p><strong>Estimated Savings:</strong> ${savings}</p>
            </div>
            
            <p>The trip schedule has been updated. Please check the dashboard for details.</p>
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Details</a>
          </center>
        </div>
      </body>
      </html>
    `;

    return {
      to: [], // Will be filled by caller
      subject: `💰 Your Trip Has Been Optimized`,
      html,
      text: `Your trip has been combined with ${tripCount - 1} other trips. New departure time: ${newDepartureTime}. Estimated savings: ${savings}.`
    };
  }

  // Create cancellation notification template
  private createCancellationTemplate(trip: Trip): EmailTemplate {
    const departureLocation = getLocationName(trip.departureLocation);
    const destination = getLocationName(trip.destination);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Trip Cancelled</h1>
          </div>
          
          <div class="content">
            <p>Your trip has been cancelled:</p>
            <p><strong>From:</strong> ${departureLocation}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Date:</strong> ${trip.departureDate}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: trip.userEmail,
      subject: `⚠️ Trip Cancelled - ${trip.id}`,
      html,
      text: `Your trip from ${departureLocation} to ${destination} on ${trip.departureDate} has been cancelled.`
    };
  }

  // Create approval notification template
  private createApprovalTemplate(trip: Trip): EmailTemplate {
    const departureLocation = getLocationName(trip.departureLocation);
    const destination = getLocationName(trip.destination);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Trip Approved</h1>
          </div>
          
          <div class="content">
            <p>Your trip has been approved:</p>
            <p><strong>From:</strong> ${departureLocation}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Departure:</strong> ${trip.departureDate} at ${trip.departureTime}</p>
            ${trip.returnDate ? `<p><strong>Return:</strong> ${trip.returnDate}</p>` : ''}
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">View Details</a>
          </center>
        </div>
      </body>
      </html>
    `;

    return {
      to: trip.userEmail,
      subject: `✅ Trip Approved - ${trip.id}`,
      html,
      text: `Your trip from ${departureLocation} to ${destination} on ${trip.departureDate} has been approved.`
    };
  }
}

export const emailService = new EmailService();