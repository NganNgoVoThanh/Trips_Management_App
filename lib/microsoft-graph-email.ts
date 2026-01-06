// lib/microsoft-graph-email.ts
// Microsoft Graph API Email Service
// Uses Azure AD OAuth2 Client Credentials Flow

/**
 * Microsoft Graph API Email Service
 *
 * Configuration:
 * - Sender: no-reply.trips@intersnack.com.vn
 * - API Endpoint: https://graph.microsoft.com/v1.0/users/no-reply.trips@intersnack.com.vn/sendMail
 * - Authentication: Azure AD Client Credentials Flow
 *
 * Environment Variables Required:
 * - GRAPH_CLIENT_ID: Azure AD Application (Client) ID
 * - GRAPH_CLIENT_SECRET: Client Secret Value
 * - GRAPH_TENANT_ID: Azure AD Tenant ID
 */

interface GraphEmailParams {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  from?: 'no-reply' | 'approvals'; // Email type routing
  replyTo?: string;
}

interface GraphAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GraphEmailMessage {
  message: {
    subject: string;
    body: {
      contentType: 'HTML' | 'Text';
      content: string;
    };
    toRecipients: Array<{ emailAddress: { address: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string } }>;
    replyTo?: Array<{ emailAddress: { address: string } }>;
    from?: {
      emailAddress: {
        address: string;
        name: string;
      };
    };
  };
  saveToSentItems: boolean;
}

/**
 * Microsoft Graph Email Service Class
 */
class MicrosoftGraphEmailService {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private tokenEndpoint: string;

  // Email addresses configuration
  private readonly emailAddresses = {
    'no-reply': {
      address: 'no-reply.trips@intersnack.com.vn',
      name: 'Trips Management System',
      endpoint: 'https://graph.microsoft.com/v1.0/users/no-reply.trips@intersnack.com.vn/sendMail'
    },
    'approvals': {
      // TEMPORARY: Using no-reply.trips@ for approvals until trip-approvals@ mailbox is created
      // TODO: Ask IT to create trip-approvals@intersnack.com.vn mailbox in Azure AD
      address: 'no-reply.trips@intersnack.com.vn',
      name: 'Trip Approvals - Intersnack',
      endpoint: 'https://graph.microsoft.com/v1.0/users/no-reply.trips@intersnack.com.vn/sendMail'
    }
  };

  // Token cache (simple in-memory cache)
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.GRAPH_CLIENT_ID || '';
    this.clientSecret = process.env.GRAPH_CLIENT_SECRET || '';
    this.tenantId = process.env.GRAPH_TENANT_ID || process.env.AZURE_AD_TENANT_ID || '';
    this.tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      console.warn('⚠️ Microsoft Graph API credentials not configured');
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.tenantId);
  }

  /**
   * Get OAuth2 access token using Client Credentials Flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now + 300000) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      });

      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token request failed: ${response.status} - ${error}`);
      }

      const data: GraphAccessToken = await response.json();

      // Cache the token
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000);

      console.log('✅ Microsoft Graph access token obtained');
      return data.access_token;

    } catch (error: any) {
      console.error('❌ Failed to get Graph API access token:', error.message);
      throw new Error(`Graph API authentication failed: ${error.message}`);
    }
  }

  /**
   * Send email via Microsoft Graph API
   */
  async sendEmail(params: GraphEmailParams): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft Graph API is not configured. Please set GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_TENANT_ID environment variables.');
    }

    try {
      // Get access token
      const accessToken = await this.getAccessToken();

      // Determine which sender to use
      const emailType = params.from || 'no-reply';
      const senderConfig = this.emailAddresses[emailType];

      // Normalize recipients to arrays
      const toArray = Array.isArray(params.to) ? params.to : [params.to];

      // Build Graph API message
      const message: GraphEmailMessage = {
        message: {
          subject: params.subject,
          body: {
            contentType: 'HTML',
            content: params.html
          },
          toRecipients: toArray.map(email => ({
            emailAddress: { address: email }
          })),
          from: {
            emailAddress: {
              address: senderConfig.address,
              name: senderConfig.name
            }
          }
        },
        saveToSentItems: true
      };

      // Add CC recipients if provided
      if (params.cc && params.cc.length > 0) {
        message.message.ccRecipients = params.cc.map(email => ({
          emailAddress: { address: email }
        }));
      }

      // Add BCC recipients if provided
      if (params.bcc && params.bcc.length > 0) {
        message.message.bccRecipients = params.bcc.map(email => ({
          emailAddress: { address: email }
        }));
      }

      // Add replyTo if provided
      if (params.replyTo) {
        message.message.replyTo = [{
          emailAddress: { address: params.replyTo }
        }];
      }

      // Send email via Graph API
      const response = await fetch(senderConfig.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle specific error codes
        if (response.status === 403) {
          throw new Error(`403 Forbidden: The application may not have Mail.Send permission. Error: ${errorText}`);
        }

        throw new Error(`Graph API request failed: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Email sent via Graph API to: ${toArray.join(', ')}`);
      console.log(`   From: ${senderConfig.address}`);
      console.log(`   Subject: ${params.subject}`);

    } catch (error: any) {
      console.error('❌ Failed to send email via Graph API:', error.message);
      throw error;
    }
  }

  /**
   * Send manager confirmation email (uses no-reply sender)
   */
  async sendManagerConfirmation(params: {
    to: string;
    managerEmail: string;
    userName: string;
    userEmail: string;
    confirmUrl: string;
    rejectUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const html = this.buildManagerConfirmationHTML(params);

    await this.sendEmail({
      to: params.to,
      subject: `Action Required: Manager Confirmation for ${params.userName}`,
      html,
      from: 'no-reply'
    });
  }

  /**
   * Send trip approval notification (uses approvals sender if configured)
   */
  async sendTripApproval(params: {
    to: string;
    userName: string;
    tripDetails: string;
    approvalUrl?: string;
  }): Promise<void> {
    const html = this.buildTripApprovalHTML(params);

    await this.sendEmail({
      to: params.to,
      subject: '✅ Trip Approved',
      html,
      from: 'approvals' // Use trip-approvals@ sender
    });
  }

  /**
   * Build manager confirmation email HTML
   */
  private buildManagerConfirmationHTML(params: {
    userName: string;
    userEmail: string;
    confirmUrl: string;
    rejectUrl: string;
    expiresAt: Date;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #C00000, #E57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #C00000; border-radius: 4px; }
    .buttons { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .btn-confirm { background: #4CAF50; color: white; }
    .btn-reject { background: #f44336; color: white; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Manager Confirmation Required</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Trip Management System</p>
    </div>
    <div class="content">
      <p>Dear Manager,</p>
      <p><strong>${params.userName}</strong> has selected you as their reporting manager in the Trip Management System.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #C00000;">Employee Details</h3>
        <p><strong>Name:</strong> ${params.userName}</p>
        <p><strong>Email:</strong> ${params.userEmail}</p>
      </div>

      <p><strong>What does this mean?</strong></p>
      <ul>
        <li>Review and approve/reject business trip requests from this employee</li>
        <li>Receive email notifications for pending trip approvals</li>
        <li>Be listed as the reporting manager for this employee</li>
      </ul>

      <div class="buttons">
        <a href="${params.confirmUrl}" class="btn btn-confirm">✓ CONFIRM</a>
        <a href="${params.rejectUrl}" class="btn btn-reject">✗ REJECT</a>
      </div>

      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul style="margin: 10px 0;">
          <li>This link will expire on <strong>${params.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
          <li>If you did not expect this request, please reject it or contact HR</li>
          <li>Only confirm if you are indeed this employee's direct manager</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated email from Trip Management System</p>
      <p>Please do not reply to this email</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build trip approval email HTML
   */
  private buildTripApprovalHTML(params: {
    userName: string;
    tripDetails: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50, #81C784); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
    .success-box { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Trip Approved!</h1>
    </div>
    <div class="content">
      <p>Dear ${params.userName},</p>
      <div class="success-box">
        <h3 style="margin-top: 0; color: #4CAF50;">Your trip has been approved!</h3>
        <p>${params.tripDetails}</p>
      </div>
      <p>You can now proceed with your travel arrangements.</p>
    </div>
    <div class="footer">
      <p>Trip Management System - Intersnack</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const graphEmailService = new MicrosoftGraphEmailService();

/**
 * Helper function to send email via Graph API
 */
export async function sendGraphEmail(params: GraphEmailParams): Promise<void> {
  return graphEmailService.sendEmail(params);
}
