// scripts/test-graph-email.js
// Test script for Microsoft Graph API email sending

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Test Microsoft Graph API Email Service
 */
async function testGraphEmail() {
  console.log('\n=== Microsoft Graph API Email Test ===\n');

  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log('GRAPH_CLIENT_ID:', process.env.GRAPH_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('GRAPH_CLIENT_SECRET:', process.env.GRAPH_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('AZURE_AD_TENANT_ID:', process.env.AZURE_AD_TENANT_ID ? '✅ Set' : '❌ Missing');
  console.log('EMAIL_NO_REPLY:', process.env.EMAIL_NO_REPLY || 'no-reply.trips@intersnack.com.vn');
  console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001');
  console.log('');

  if (!process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET || !process.env.AZURE_AD_TENANT_ID) {
    console.error('❌ Missing required environment variables!');
    console.error('Please set: GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, AZURE_AD_TENANT_ID');
    process.exit(1);
  }

  // Test recipient (change this to your test email)
  const testRecipient = process.argv[2] || 'ngan.ngo@intersnack.com.vn';

  console.log(`📧 Test Email Recipient: ${testRecipient}`);
  console.log('');

  try {
    // Step 1: Get Access Token
    console.log('🔑 Step 1: Getting OAuth2 Access Token...');
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Access token obtained successfully');
    console.log(`   Token type: ${tokenData.token_type}`);
    console.log(`   Expires in: ${tokenData.expires_in} seconds`);
    console.log('');

    // Step 2: Send Test Email
    console.log('📤 Step 2: Sending test email via Graph API...');

    const emailEndpoint = 'https://graph.microsoft.com/v1.0/users/no-reply.trips@intersnack.com.vn/sendMail';

    const emailMessage = {
      message: {
        subject: '🧪 Test Email - Microsoft Graph API',
        body: {
          contentType: 'HTML',
          content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50, #81C784); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    .success-box { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .info-table { width: 100%; margin: 20px 0; }
    .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
    .info-table td:first-child { font-weight: bold; color: #666; width: 150px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Test Email Successful!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Microsoft Graph API Integration</p>
    </div>
    <div class="content">
      <div class="success-box">
        <h3 style="margin-top: 0; color: #4CAF50;">🎉 Email Service Working!</h3>
        <p>This test email confirms that the Microsoft Graph API email integration is working correctly.</p>
      </div>

      <h3>📋 Configuration Details:</h3>
      <table class="info-table">
        <tr>
          <td>Sender</td>
          <td>no-reply.trips@intersnack.com.vn</td>
        </tr>
        <tr>
          <td>Service</td>
          <td>Microsoft Graph API v1.0</td>
        </tr>
        <tr>
          <td>Authentication</td>
          <td>OAuth2 Client Credentials</td>
        </tr>
        <tr>
          <td>Test Date</td>
          <td>${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
        </tr>
      </table>

      <h3>✨ Next Steps:</h3>
      <ul>
        <li>✅ Microsoft Graph API is configured correctly</li>
        <li>✅ OAuth2 authentication successful</li>
        <li>✅ Email sending operational</li>
        <li>📧 All system emails will now be sent via this service</li>
      </ul>

      <div class="footer">
        <p><strong>Trips Management System</strong></p>
        <p>This is an automated test email - No action required</p>
      </div>
    </div>
  </div>
</body>
</html>
          `
        },
        toRecipients: [
          {
            emailAddress: {
              address: testRecipient
            }
          }
        ],
        from: {
          emailAddress: {
            address: 'no-reply.trips@intersnack.com.vn',
            name: 'Trips Management System'
          }
        }
      },
      saveToSentItems: true
    };

    const emailResponse = await fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailMessage)
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();

      // Handle 403 Forbidden specifically
      if (emailResponse.status === 403) {
        console.error('');
        console.error('❌ 403 FORBIDDEN ERROR');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('The application does not have permission to send emails.');
        console.error('');
        console.error('Required Azure AD Permissions:');
        console.error('  • Mail.Send (Application permission)');
        console.error('');
        console.error('Please contact IT to:');
        console.error('  1. Grant "Mail.Send" permission to the app');
        console.error('  2. Admin consent for the permission');
        console.error('');
        console.error('Error details:', errorText);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
        process.exit(1);
      }

      throw new Error(`Email send failed: ${emailResponse.status} - ${errorText}`);
    }

    console.log('✅ Email sent successfully via Microsoft Graph API!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`📧 Test email sent to: ${testRecipient}`);
    console.log('📬 Check your inbox to verify receipt');
    console.log('');
    console.log('Next steps:');
    console.log('  1. ✅ Verify email received');
    console.log('  2. ✅ Check email formatting');
    console.log('  3. ✅ Integration ready for production');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    console.error('');

    if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('Network Error: Cannot reach Microsoft servers');
      console.error('Please check your internet connection');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    process.exit(1);
  }
}

// Run the test
testGraphEmail().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
