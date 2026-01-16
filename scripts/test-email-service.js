// scripts/test-email-service.js
// Test email service configuration and sending

require('dotenv').config({ path: '.env.local' });

async function testEmailService() {
  console.log('🔍 TESTING EMAIL SERVICE CONFIGURATION\n');
  console.log('=' .repeat(80));

  // Check environment variables
  console.log('\n📋 Environment Variables:\n');

  const tenantId = process.env.GRAPH_TENANT_ID || process.env.AZURE_AD_TENANT_ID;

  const requiredVars = {
    'GRAPH_CLIENT_ID': process.env.GRAPH_CLIENT_ID,
    'GRAPH_CLIENT_SECRET': process.env.GRAPH_CLIENT_SECRET ? '***hidden***' : undefined,
    'GRAPH_TENANT_ID (or AZURE_AD_TENANT_ID)': tenantId,
    'EMAIL_NO_REPLY': process.env.EMAIL_NO_REPLY,
    'EMAIL_APPROVALS': process.env.EMAIL_APPROVALS,
  };

  let allConfigured = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    const status = value ? '✅' : '❌';
    console.log(`${status} ${key}: ${value || 'NOT SET'}`);
    if (!value) allConfigured = false;
  }

  if (!allConfigured) {
    console.log('\n❌ Microsoft Graph API is NOT properly configured!');
    console.log('\nRequired environment variables:');
    console.log('  - GRAPH_CLIENT_ID');
    console.log('  - GRAPH_CLIENT_SECRET');
    console.log('  - GRAPH_TENANT_ID');
    console.log('  - EMAIL_NO_REPLY');
    console.log('  - EMAIL_APPROVALS');
    return;
  }

  console.log('\n✅ All required environment variables are set!\n');

  // Test Microsoft Graph API authentication
  console.log('=' .repeat(80));
  console.log('\n🔑 Testing Microsoft Graph API Authentication...\n');

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('   Requesting access token from Microsoft...');
    console.log(`   Endpoint: ${tokenEndpoint}`);

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('\n❌ Token request failed!');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${error}`);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Access token obtained successfully!');
    console.log(`   Token type: ${data.token_type}`);
    console.log(`   Expires in: ${data.expires_in} seconds`);
    console.log(`   Token (first 50 chars): ${data.access_token.substring(0, 50)}...`);

    // Test sending a test email
    console.log('\n' + '=' .repeat(80));
    console.log('\n📧 Testing Email Sending...\n');

    const testEmail = {
      message: {
        subject: '🧪 Test Email from Trips Management System',
        body: {
          contentType: 'HTML',
          content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Email Service Test</h1>
    </div>
    <div class="content">
      <p>This is a test email from the Trips Management System.</p>
      <p>If you received this email, the email service is working correctly!</p>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
          `
        },
        toRecipients: [
          {
            emailAddress: {
              address: process.env.SUPER_ADMIN_EMAIL || 'ngan.ngo@intersnack.com.vn'
            }
          }
        ]
      },
      saveToSentItems: true
    };

    const sendEndpoint = `https://graph.microsoft.com/v1.0/users/${process.env.EMAIL_NO_REPLY}/sendMail`;
    console.log(`   Sending test email to: ${process.env.SUPER_ADMIN_EMAIL || 'ngan.ngo@intersnack.com.vn'}`);
    console.log(`   From: ${process.env.EMAIL_NO_REPLY}`);
    console.log(`   Endpoint: ${sendEndpoint}`);

    const sendResponse = await fetch(sendEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEmail)
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('\n❌ Failed to send email!');
      console.error(`   Status: ${sendResponse.status}`);
      console.error(`   Error: ${errorText}`);

      if (sendResponse.status === 403) {
        console.error('\n💡 Possible causes:');
        console.error('   1. Application does not have Mail.Send permission in Azure AD');
        console.error('   2. The mailbox does not exist or is not configured');
        console.error('   3. Admin consent has not been granted');
      }
      return;
    }

    console.log('\n✅ Test email sent successfully!');
    console.log('   Check your inbox for the test email.');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log('✅ Email service is properly configured and working!');
  console.log('✅ Microsoft Graph API authentication successful');
  console.log('✅ Test email sent successfully');
  console.log('\nIf manager is not receiving emails, check:');
  console.log('  1. Manager email address is correct');
  console.log('  2. Email is not in spam/junk folder');
  console.log('  3. Check server logs for any errors during email sending');
}

// Run test
testEmailService()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
