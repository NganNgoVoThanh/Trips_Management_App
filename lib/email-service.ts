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
Intersnack Cashew Company
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Created for ${trip.userName || 'Employee'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Trip Created for ${trip.userName || 'Employee'}
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Your trip has been registered in the system
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">

              <!-- Greeting -->
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${trip.userName || 'Employee'}</strong>,
              </p>

              <!-- Success Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%); border-left: 4px solid #10B981; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #10B981; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">✓</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #047857; font-size: 16px; font-weight: 700;">
                            Trip Registration Confirmed
                          </p>
                          <p style="margin: 0; color: #065F46; font-size: 15px; line-height: 1.5;">
                            Your trip has been successfully created and registered in the system.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                            Trip Details
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">From</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(trip.departureLocation || '')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">To</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(trip.destination || '')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Departure</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trip.departureDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.departureTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; ${trip.vehicleType || trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Return</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trip.returnDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.returnTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${trip.vehicleType ? `
                      <tr>
                        <td style="padding: 12px 0; ${trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      ${trip.estimatedCost ? `
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Estimated Cost</td>
                              <td style="color: #DC2626; font-size: 17px; font-weight: 800; text-align: right;">${formatCurrency(trip.estimatedCost)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Help Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 0 10px 10px 0; padding: 18px 24px;">
                    <p style="margin: 0; color: #991B1B; font-size: 15px; line-height: 1.6;">
                      <strong>Need Help?</strong> If you have any questions or need to make changes, please contact the admin team.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">
                Trips Management System
              </p>

              <!-- Footer Text -->
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #D1D5DB;">Intersnack Cashew Company</strong>
              </p>

              <!-- Disclaimer -->
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
Intersnack Cashew Company
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      ✓ Trip Approved
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Your trip has been approved by the admin team
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">

              <!-- Greeting -->
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${trip.userName || 'Employee'}</strong>,
              </p>

              <!-- Success Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%); border-left: 4px solid #10B981; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #10B981; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">✓</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #047857; font-size: 16px; font-weight: 700;">
                            Trip Approved!
                          </p>
                          <p style="margin: 0; color: #065F46; font-size: 15px; line-height: 1.5;">
                            Your trip has been approved by the admin team. You can now proceed with your travel arrangements.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                            Trip Details
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">From</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(trip.departureLocation || '')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">To</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${getLocationName(trip.destination || '')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Departure</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trip.departureDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.departureTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; ${trip.vehicleType || trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Return</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trip.returnDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.returnTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${trip.vehicleType ? `
                      <tr>
                        <td style="padding: 12px 0; ${trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      ${trip.estimatedCost ? `
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Estimated Cost</td>
                              <td style="color: #DC2626; font-size: 17px; font-weight: 800; text-align: right;">${formatCurrency(trip.estimatedCost)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Status Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; font-size: 14px; font-weight: 700; padding: 10px 24px; border-radius: 20px; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                          Status: ${trip.status}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">
                Trips Management System
              </p>

              <!-- Footer Text -->
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #D1D5DB;">Intersnack Cashew Company</strong>
              </p>

              <!-- Disclaimer -->
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
Intersnack Cashew Company
      `.trim();

      // Calculate time difference for display
      const getTimeDiff = (original: string, newTime: string) => {
        const [origHour, origMin] = original.split(':').map(Number);
        const [newHour, newMin] = newTime.split(':').map(Number);
        const diff = (newHour * 60 + newMin) - (origHour * 60 + origMin);
        if (diff === 0) return 'No change';
        if (diff > 0) return `+${diff} minutes later`;
        return `${Math.abs(diff)} minutes earlier`;
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Trip Has Been Optimized</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Your Trip Has Been Optimized
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      Your travel schedule has been updated
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">

              <!-- Greeting -->
              <p style="color: #1F2937; font-size: 17px; line-height: 1.6; margin: 0 0 28px 0;">
                Dear <strong style="color: #DC2626;">${userTrips[0].userName || 'Employee'}</strong>,
              </p>

              <!-- Info Banner -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF2F2 0%, #FEE2E2 100%); border-left: 4px solid #DC2626; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #DC2626; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">!</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #991B1B; font-size: 16px; font-weight: 700;">
                            Schedule Update Notice
                          </p>
                          <p style="margin: 0; color: #7F1D1D; font-size: 15px; line-height: 1.5;">
                            Your trip has been combined with colleagues traveling the same route for cost optimization. Please review the updated schedule below.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trip Cards -->
              ${userTrips.map(trip => {
        const originalTime = trip.originalDepartureTime || trip.departureTime;
        const timeDiff = getTimeDiff(originalTime, proposedDepartureTime);

        return `
              <!-- Trip Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Route Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px; text-align: center;">
                            ${getLocationName(trip.departureLocation || '')} &nbsp;→&nbsp; ${getLocationName(trip.destination || '')}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Trip Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Travel Date</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trip.departureDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 35%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${vehicleInfo}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Time Change Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 0 24px 24px 24px;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border: 3px solid #FCA5A5; border-radius: 12px; padding: 28px 20px; text-align: center;">

                          <!-- Old Time -->
                          <p style="margin: 0 0 6px 0; color: #9CA3AF; font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700;">
                            Original Time
                          </p>
                          <p style="margin: 0 0 16px 0; color: #9CA3AF; font-size: 24px; font-weight: 600; text-decoration: line-through;">
                            ${originalTime}
                          </p>

                          <!-- Arrow -->
                          <p style="margin: 0; color: #DC2626; font-size: 24px; font-weight: 700;">
                            ↓
                          </p>

                          <!-- New Time -->
                          <p style="margin: 16px 0 6px 0; color: #DC2626; font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700;">
                            New Departure Time
                          </p>
                          <p style="margin: 0; color: #DC2626; font-size: 36px; font-weight: 900; letter-spacing: -0.5px;">
                            ${proposedDepartureTime}
                          </p>

                          <!-- Time Difference Badge -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto 0 auto;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 20px; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);">
                                ${timeDiff}
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
                `;
      }).join('')}

              <!-- Savings Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border: 3px solid #6EE7B7; border-radius: 12px; padding: 28px; text-align: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
                    <p style="margin: 0 0 8px 0; color: #047857; font-size: 14px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700;">
                      Estimated Company Savings
                    </p>
                    <p style="margin: 0; color: #065F46; font-size: 38px; font-weight: 900; letter-spacing: -1px;">
                      ${formatCurrency(estimatedSavings)}
                    </p>
                    <p style="margin: 12px 0 0 0; color: #059669; font-size: 15px; font-weight: 500;">
                      Thank you for contributing to cost efficiency!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action Required Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #DC2626; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">!</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #991B1B; font-size: 16px; font-weight: 700;">
                            Action Required
                          </p>
                          <p style="margin: 0; color: #7F1D1D; font-size: 15px; line-height: 1.6;">
                            Please adjust your schedule to the new departure time. If this change causes any conflicts with your plans, contact the admin team immediately.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Help Text -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="border-top: 2px solid #E5E7EB; padding-top: 24px;">
                    <p style="margin: 0; color: #6B7280; font-size: 15px; line-height: 1.6; text-align: center;">
                      If you have any questions, please don't hesitate to contact the admin team.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">
                Trips Management System
              </p>

              <!-- Footer Text -->
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #D1D5DB;">Intersnack Cashew Company</strong>
              </p>

              <!-- Disclaimer -->
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
    const vehicleInfo = config.vehicles[vehicleType as keyof typeof config.vehicles]?.name || vehicleType;

    const tripList = trips.map(trip => {
      return `• ${trip.userName} (${trip.userEmail}): ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}`;
    }).join('\n');

    const body = `
Trip Optimization Summary
========================

Number of Trips Combined: ${trips.length}
Departure Date: ${new Date(trips[0].departureDate).toLocaleDateString()}
New Departure Time: ${proposedDepartureTime}
Vehicle Type: ${vehicleInfo}
Estimated Savings: ${formatCurrency(estimatedSavings)}

Affected Employees:
${tripList}

All affected employees have been notified via email.

--
Intersnack Trips Management System
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Optimization Approved - ${trips.length} Trips Combined</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #E5E7EB; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #E5E7EB;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px 12px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 35px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 10px; padding: 14px 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                          <span style="color: #DC2626; font-size: 26px; font-weight: 900; letter-spacing: 1.5px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 28px 0 10px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Trip Optimization Approved
                    </h1>
                    <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px; font-weight: 400;">
                      ${trips.length} Trips Successfully Combined
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 45px 40px;">

              <!-- Summary Stats -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <!-- Trips Combined -->
                  <td style="width: 48%; background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border-radius: 12px; padding: 28px 20px; text-align: center; vertical-align: top; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);">
                    <p style="margin: 0 0 8px 0; color: #991B1B; font-size: 42px; font-weight: 900; letter-spacing: -1px;">
                      ${trips.length}
                    </p>
                    <p style="margin: 0; color: #DC2626; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Trips Combined
                    </p>
                  </td>
                  <td style="width: 4%;"></td>
                  <!-- Savings -->
                  <td style="width: 48%; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 12px; padding: 28px 20px; text-align: center; vertical-align: top; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
                    <p style="margin: 0 0 8px 0; color: #065F46; font-size: 32px; font-weight: 900; letter-spacing: -1px;">
                      ${formatCurrency(estimatedSavings)}
                    </p>
                    <p style="margin: 0; color: #047857; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Estimated Savings
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #4B5563 0%, #374151 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                            Optimization Details
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 40%;">Departure Date</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">
                                ${new Date(trips[0].departureDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 40%;">Departure Time</td>
                              <td style="color: #DC2626; font-size: 17px; font-weight: 800; text-align: right;">${proposedDepartureTime}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 15px; font-weight: 600; width: 40%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 15px; font-weight: 700; text-align: right;">${vehicleInfo}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Employees List -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, #374151 0%, #1F2937 100%); padding: 18px 24px;">
                          <p style="margin: 0; color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                            Affected Employees (${trips.length})
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Employee List -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 20px 24px;">
                      ${trips.map((trip, index) => `
                      <tr>
                        <td style="padding: 14px 0; ${index < trips.length - 1 ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="width: 42px; vertical-align: top;">
                                <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 50%; color: white; font-size: 16px; font-weight: 700; text-align: center; line-height: 38px; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);">
                                  ${(trip.userName || 'U').charAt(0).toUpperCase()}
                                </div>
                              </td>
                              <td style="vertical-align: middle; padding-left: 12px;">
                                <p style="margin: 0 0 3px 0; color: #1F2937; font-size: 15px; font-weight: 700;">
                                  ${trip.userName || 'Unknown'}
                                </p>
                                <p style="margin: 0; color: #6B7280; font-size: 13px;">
                                  ${trip.userEmail}
                                </p>
                              </td>
                              <td style="vertical-align: middle; text-align: right;">
                                <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 500;">
                                  ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `).join('')}
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Success Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px;">
                <tr>
                  <td style="background: linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%); border-left: 4px solid #10B981; border-radius: 0 10px 10px 0; padding: 20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 45px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #10B981; color: white; font-size: 20px; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 50%; font-weight: bold;">✓</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; color: #065F46; font-size: 15px; line-height: 1.6; font-weight: 500;">
                            <strong style="font-weight: 700;">All affected employees have been notified</strong> via email about their updated trip schedules.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 0 0 12px 12px; padding: 35px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 18px 0; color: #DC2626; font-size: 20px; font-weight: 800; letter-spacing: 1.5px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 22px 0; color: #D1D5DB; font-size: 14px; font-weight: 500;">
                Trips Management System
              </p>

              <!-- Subtitle -->
              <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                <strong style="color: #D1D5DB;">Admin Notification</strong>
              </p>

              <!-- Disclaimer -->
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 12px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `.trim();

    await this.sendEmail({
      to: adminEmails,
      subject,
      body,
      html,
      category: 'notification'
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

    // Send notification to user
    const userSubject = 'Trip Cancellation Notice';
    const userBody = `
Dear ${trip.userName || 'Employee'},

Your trip scheduled for ${new Date(trip.departureDate).toLocaleDateString()} from ${getLocationName(trip.departureLocation || '')} to ${getLocationName(trip.destination || '')} has been cancelled.

If you have any questions, please contact the admin team.

Best regards,
Intersnack Cashew Company
    `.trim();

    await this.sendEmail({
      to: [trip.userEmail],
      subject: userSubject,
      body: userBody
    });

    // Send notification to admin
    const adminEmail = 'ngan.ngo@intersnack.com.vn'; // Default admin email
    const adminSubject = `Trip Cancelled by User - ${trip.userName}`;
    const adminBody = `
Trip Cancellation Alert

User ${trip.userName} (${trip.userEmail}) has cancelled their approved trip:

Trip Details:
- Date: ${new Date(trip.departureDate).toLocaleDateString()}
- Route: ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}
- Vehicle: ${trip.vehicleType}
- Status: ${trip.status}
- Trip ID: ${trip.id}

Please review and take necessary actions.

Trips Management System
    `.trim();

    try {
      await this.sendEmail({
        to: [adminEmail],
        subject: adminSubject,
        body: adminBody
      });
    } catch (error) {
      console.error('Failed to send admin notification for trip cancellation:', error);
      // Don't throw - user notification already sent
    }
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
  <title>Trip Approval Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%); border-radius: 16px 16px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 30px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 12px; padding: 12px 24px;">
                          <span style="color: #C41E3A; font-size: 24px; font-weight: 800; letter-spacing: 1px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 25px 0 8px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">
                      Trip Approval Required
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 15px; font-weight: 400;">
                      Trip Created for ${trip.userName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 40px;">

              <!-- Greeting -->
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Dear <strong>${managerName}</strong>,
              </p>

              <!-- Action Required Banner -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF2F2 0%, #FEE2E2 100%); border-left: 4px solid #C41E3A; border-radius: 0 8px 8px 0; padding: 18px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #C41E3A; color: white; font-size: 18px; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 50%; font-weight: bold;">!</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #C41E3A; font-size: 15px; font-weight: 700;">
                            Action Required
                          </p>
                          <p style="margin: 0; color: #7F1D1D; font-size: 14px; line-height: 1.5;">
                            <strong>${trip.userName}</strong> has joined an existing optimized trip and requires your approval.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; padding: 15px 20px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.5;">
                      <strong>ℹ️ Note:</strong> This trip was created when ${trip.userName} joined another employee's trip through the join request system.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 25px;">
                <tr>
                  <td style="background-color: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #C41E3A; padding: 16px 20px;">
                          <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">
                            Trip Details
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 20px;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Employee</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${trip.userName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Email</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${trip.userEmail}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Route</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Departure</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${new Date(trip.departureDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.departureTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; ${trip.vehicleType ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Return</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${new Date(trip.returnDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.returnTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${trip.vehicleType ? `
                      <tr>
                        <td style="padding: 10px 0; ${trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      ${trip.estimatedCost ? `
                      <tr>
                        <td style="padding: 10px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Estimated Cost</td>
                              <td style="color: #C41E3A; font-size: 14px; font-weight: 700; text-align: right;">${formatCurrency(trip.estimatedCost)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 20px 0;">
                      Please review and take action:
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <!-- Approve Button -->
                        <td style="padding: 0 10px;">
                          <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">
                            ✓ Approve Trip
                          </a>
                        </td>
                        <!-- Reject Button -->
                        <td style="padding: 0 10px;">
                          <a href="${rejectUrl}" style="display: inline-block; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">
                            ✗ Reject Trip
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 25px;">
                <tr>
                  <td style="background: linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%); border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; padding: 15px 20px;">
                    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.5;">
                      <strong>⏰ Important:</strong> This approval link will expire in 48 hours. Please take action as soon as possible.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; border-radius: 0 0 16px 16px; padding: 30px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 15px 0; color: #C41E3A; font-size: 18px; font-weight: 700; letter-spacing: 1px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 13px;">
                Trips Management System
              </p>

              <!-- Footer Links -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 15px;">
                    <span style="color: #6B7280; font-size: 12px;">Best regards</span>
                  </td>
                  <td style="color: #4B5563;">|</td>
                  <td style="padding: 0 15px;">
                    <span style="color: #6B7280; font-size: 12px;">Admin Team</span>
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 11px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
   * Send FYI email to manager when user joins optimized trip (no approval needed)
   * This is for Option 3 - Instant Join scenario
   */
  async sendManagerFYIEmail(trip: Trip, managerEmail: string, managerName: string): Promise<void> {
    if (!managerEmail) {
      console.warn('No manager email provided for FYI notification');
      return;
    }

    const subject = `[FYI] ${trip.userName} Joined Optimized Trip`;

    const body = `
Dear ${managerName},

This is an informational notice (no action required).

${trip.userName} (${trip.userEmail}) has joined an already-optimized business trip.

Trip Details:
• Employee: ${trip.userName} (${trip.userEmail})
• From: ${getLocationName(trip.departureLocation || '')}
• To: ${getLocationName(trip.destination || '')}
• Departure: ${new Date(trip.departureDate).toLocaleDateString()} at ${trip.departureTime}
• Return: ${new Date(trip.returnDate).toLocaleDateString()} at ${trip.returnTime}
${trip.vehicleType ? `• Vehicle: ${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}` : ''}
${trip.estimatedCost ? `• Estimated Cost: ${formatCurrency(trip.estimatedCost)}` : ''}

Status: ✅ Confirmed (Auto-approved)

This trip was previously approved and optimized with other employees traveling the same route. Your team member has been added to this shared trip for cost efficiency.

NO ACTION REQUIRED from you. This is for your information only.

Best regards,
Trips Management System
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Join Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

          <!-- Header with Intersnack Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 30px 40px; text-align: center;">
                    <!-- Company Logo Area -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: white; border-radius: 12px; padding: 12px 24px;">
                          <span style="color: #C41E3A; font-size: 24px; font-weight: 800; letter-spacing: 1px;">INTERSNACK</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="color: white; margin: 25px 0 8px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">
                      Trip Join Notification
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 15px; font-weight: 400;">
                      For Your Information - No Action Required
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="background-color: white; padding: 40px;">

              <!-- Greeting -->
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Dear <strong>${managerName}</strong>,
              </p>

              <!-- FYI Banner -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(90deg, #ECFDF5 0%, #D1FAE5 100%); border-left: 4px solid #10B981; border-radius: 0 8px 8px 0; padding: 18px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <span style="display: inline-block; background-color: #10B981; color: white; font-size: 18px; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 50%; font-weight: bold;">ℹ</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px 0; color: #047857; font-size: 15px; font-weight: 700;">
                            For Your Information
                          </p>
                          <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.5;">
                            <strong>No action is required from you.</strong> This is an informational notice about ${trip.userName}'s trip.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Auto-Confirmed Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                <tr>
                  <td style="background-color: #D1FAE5; border-left: 4px solid #10B981; border-radius: 0 8px 8px 0; padding: 15px 20px;">
                    <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.5;">
                      <strong>✓ Auto-Confirmed:</strong> ${trip.userName} has joined an already-optimized trip that was previously approved.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Trip Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 25px;">
                <tr>
                  <td style="background-color: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">

                    <!-- Card Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #10B981; padding: 16px 20px;">
                          <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">
                            Trip Details
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 20px;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Employee</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${trip.userName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Email</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${trip.userEmail}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Route</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${getLocationName(trip.departureLocation || '')} → ${getLocationName(trip.destination || '')}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Departure</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${new Date(trip.departureDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.departureTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; ${trip.vehicleType ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Return</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">
                                ${new Date(trip.returnDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${trip.returnTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${trip.vehicleType ? `
                      <tr>
                        <td style="padding: 10px 0; ${trip.estimatedCost ? 'border-bottom: 1px solid #E5E7EB;' : 'border-bottom: 1px solid #E5E7EB;'}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Vehicle</td>
                              <td style="color: #1F2937; font-size: 14px; font-weight: 600; text-align: right;">${config.vehicles[trip.vehicleType as keyof typeof config.vehicles]?.name || trip.vehicleType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      ${trip.estimatedCost ? `
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Estimated Cost</td>
                              <td style="color: #C41E3A; font-size: 14px; font-weight: 700; text-align: right;">${formatCurrency(trip.estimatedCost)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 10px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 40%;">Status</td>
                              <td style="text-align: right;">
                                <span style="display: inline-block; background-color: #D1FAE5; color: #065F46; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;">✓ Confirmed</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Why No Approval Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 25px;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; padding: 15px 20px;">
                    <p style="margin: 0 0 5px 0; color: #92400E; font-size: 14px; font-weight: 700;">
                      ℹ️ Why no approval needed?
                    </p>
                    <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.5;">
                      This trip was already approved and optimized with other employees traveling the same route. Your team member has been added to this shared trip for cost efficiency.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- No Action Required Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 25px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border: 2px solid #6EE7B7; border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #065F46; font-size: 20px; font-weight: 700;">
                      ✓ No Action Required
                    </p>
                    <p style="margin: 0; color: #047857; font-size: 14px;">
                      This email is for your information only.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; border-radius: 0 0 16px 16px; padding: 30px 40px; text-align: center;">

              <!-- Company Name -->
              <p style="margin: 0 0 15px 0; color: #C41E3A; font-size: 18px; font-weight: 700; letter-spacing: 1px;">
                INTERSNACK
              </p>

              <!-- Tagline -->
              <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 13px;">
                Trips Management System
              </p>

              <!-- Footer Links -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 15px;">
                    <span style="color: #6B7280; font-size: 12px;">Best regards</span>
                  </td>
                  <td style="color: #4B5563;">|</td>
                  <td style="padding: 0 15px;">
                    <span style="color: #6B7280; font-size: 12px;">Admin Team</span>
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 11px; line-height: 1.5;">
                This is an automated notification from the Trips Management System.<br>
                Please do not reply directly to this email.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

    await this.sendEmail({
      to: managerEmail,
      cc: [trip.userEmail], // CC user
      subject,
      text: body,
      html,
      category: 'notification'
    });

    console.log(`✅ Manager FYI email sent to ${managerEmail} for instant join trip ${trip.id}`);
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