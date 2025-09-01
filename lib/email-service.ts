// lib/email-service.ts
import { Trip } from './fabric-service';
import { config, getLocationName, formatCurrency } from './config';

export interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private apiEndpoint: string;
  
  constructor() {
    // In production, use actual email service (SendGrid, AWS SES, etc.)
    this.apiEndpoint = process.env.NEXT_PUBLIC_EMAIL_API_URL || '';
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
    const emails = trips.map(t => t.userEmail);
    const template = this.createOptimizationTemplate(trips, newDepartureTime, vehicleType, estimatedSavings);
    template.to = emails;
    await this.sendEmail(template);
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

  // Create trip confirmation email template
  private createTripConfirmationTemplate(trip: Trip): EmailTemplate {
    const departureLocation = getLocationName(trip.departureLocation);
    const destination = getLocationName(trip.destination);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .logo { max-width: 150px; margin-bottom: 10px; }
          h1 { color: #2c3e50; margin: 0; }
          .trip-details { background: #fff; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #495057; }
          .value { color: #212529; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://intersnack.com.vn/logo.png" alt="Intersnack" class="logo">
            <h1>Trip Registration Confirmed</h1>
          </div>
          
          <p>Dear ${trip.userName},</p>
          <p>Your business trip request has been successfully registered in our system.</p>
          
          <div class="trip-details">
            <h2>Trip Details</h2>
            <div class="detail-row">
              <span class="label">Trip ID:</span>
              <span class="value">${trip.id}</span>
            </div>
            <div class="detail-row">
              <span class="label">From:</span>
              <span class="value">${departureLocation}</span>
            </div>
            <div class="detail-row">
              <span class="label">To:</span>
              <span class="value">${destination}</span>
            </div>
            <div class="detail-row">
              <span class="label">Departure:</span>
              <span class="value">${trip.departureDate} at ${trip.departureTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">Return:</span>
              <span class="value">${trip.returnDate} at ${trip.returnTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value">${trip.status}</span>
            </div>
            ${trip.estimatedCost ? `
            <div class="detail-row">
              <span class="label">Estimated Cost:</span>
              <span class="value">${formatCurrency(trip.estimatedCost)}</span>
            </div>
            ` : ''}
          </div>
          
          <p>You will receive a notification once your trip is approved or if there are any changes to your schedule.</p>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Dashboard</a>
          </center>
          
          <div class="footer">
            <p>This is an automated email from Intersnack Trips Management System.</p>
            <p>For support, please contact: it@intersnack.com.vn</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      to: [trip.userEmail],
      subject: `Trip Registration Confirmed - ${trip.id}`,
      html,
      text: `Your trip from ${departureLocation} to ${destination} on ${trip.departureDate} has been registered.`
    };
  }

  // Create optimization notification template
  private createOptimizationTemplate(
    trips: Trip[], 
    newDepartureTime: string,
    vehicleType: string,
    estimatedSavings: number
  ): EmailTemplate {
    const trip = trips[0]; // Use first trip for location info
    const departureLocation = getLocationName(trip.departureLocation);
    const destination = getLocationName(trip.destination);
    const vehicle = config.vehicles[vehicleType as keyof typeof config.vehicles];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          h1 { margin: 0; }
          .highlight { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .trip-details { background: #fff; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #495057; }
          .value { color: #212529; }
          .savings { color: #28a745; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Trip Optimized for Cost Savings!</h1>
          </div>
          
          <p>Dear Team Members,</p>
          <p>Great news! Your business trip has been optimized to reduce transportation costs.</p>
          
          <div class="highlight">
            <h2>💰 Cost Savings Achieved</h2>
            <p class="savings">Estimated Savings: ${formatCurrency(estimatedSavings)}</p>
            <p>By combining ${trips.length} trips, we're reducing overall transportation costs.</p>
          </div>
          
          <div class="trip-details">
            <h2>Updated Trip Details</h2>
            <div class="detail-row">
              <span class="label">Route:</span>
              <span class="value">${departureLocation} → ${destination}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span class="value">${trip.departureDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">NEW Departure Time:</span>
              <span class="value" style="color: #28a745; font-weight: bold;">${newDepartureTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">Vehicle:</span>
              <span class="value">${vehicle.name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total Passengers:</span>
              <span class="value">${trips.length} employees</span>
            </div>
          </div>
          
          <h3>Affected Employees:</h3>
          <ul>
            ${trips.map(t => `<li>${t.userName} (Original time: ${t.departureTime})</li>`).join('')}
          </ul>
          
          <p><strong>Important:</strong> Please update your calendar with the new departure time.</p>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Trip Details</a>
          </center>
          
          <div class="footer">
            <p>This is an automated notification from Intersnack Trips Management System.</p>
            <p>For questions, please contact: operations@intersnack.com.vn</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      to: [],
      subject: `✈️ Trip Schedule Optimized - Save ${formatCurrency(estimatedSavings)}`,
      html,
      text: `Your trip on ${trip.departureDate} has been optimized. New departure time: ${newDepartureTime}`
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
          .header { background: #dc3545; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          h1 { margin: 0; }
          .trip-details { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Trip Cancelled</h1>
          </div>
          
          <p>Dear ${trip.userName},</p>
          <p>Your business trip has been cancelled.</p>
          
          <div class="trip-details">
            <h2>Cancelled Trip Details</h2>
            <p><strong>Trip ID:</strong> ${trip.id}</p>
            <p><strong>Route:</strong> ${departureLocation} → ${destination}</p>
            <p><strong>Date:</strong> ${trip.departureDate}</p>
          </div>
          
          <p>If you need to reschedule this trip, please submit a new request through the system.</p>
          
          <div class="footer">
            <p>This is an automated email from Intersnack Trips Management System.</p>
            <p>For support, please contact: it@intersnack.com.vn</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      to: [trip.userEmail],
      subject: `Trip Cancelled - ${trip.id}`,
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
          .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          h1 { margin: 0; }
          .trip-details { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Trip Approved</h1>
          </div>
          
          <p>Dear ${trip.userName},</p>
          <p>Your business trip has been approved!</p>
          
          <div class="trip-details">
            <h2>Approved Trip Details</h2>
            <p><strong>Trip ID:</strong> ${trip.id}</p>
            <p><strong>Route:</strong> ${departureLocation} → ${destination}</p>
            <p><strong>Departure:</strong> ${trip.departureDate} at ${trip.departureTime}</p>
            <p><strong>Return:</strong> ${trip.returnDate} at ${trip.returnTime}</p>
            ${trip.vehicleType ? `<p><strong>Vehicle:</strong> ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles].name}</p>` : ''}
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Details</a>
          </center>
          
          <div class="footer">
            <p>This is an automated email from Intersnack Trips Management System.</p>
            <p>For support, please contact: it@intersnack.com.vn</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return {
      to: [trip.userEmail],
      subject: `✅ Trip Approved - ${trip.id}`,
      html,
      text: `Your trip from ${departureLocation} to ${destination} on ${trip.departureDate} has been approved.`
    };
  }

  // Send email
  private async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      if (!this.apiEndpoint) {
        // Log email in development
        console.log('Email Template:', template);
        return;
      }

      // Send via email API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      // In production, could queue for retry or log to monitoring service
    }
  }

  // Send bulk emails with rate limiting
  async sendBulkEmails(templates: EmailTemplate[], delayMs: number = 100): Promise<void> {
    for (const template of templates) {
      await this.sendEmail(template);
      // Rate limiting to avoid overwhelming email service
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export const emailService = new EmailService();