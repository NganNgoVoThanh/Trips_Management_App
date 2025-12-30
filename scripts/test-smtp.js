// scripts/test-smtp.js
// Test SMTP configuration and send a test email

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('\n📧 SMTP Configuration Test\n');
  console.log('='.repeat(60));

  // Show current configuration
  console.log('\n📋 Current SMTP Settings:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NOT SET');
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NOT SET');
  console.log('  EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
  console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ SET (hidden)' : '❌ NOT SET');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');

  // Check if all required variables are set
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('\n❌ Missing required environment variables!');
    console.log('\nPlease set the following in .env.local:');
    console.log('  EMAIL_HOST=smtp.gmail.com (or your SMTP server)');
    console.log('  EMAIL_PORT=587');
    console.log('  EMAIL_USER=your-email@domain.com');
    console.log('  EMAIL_PASSWORD=your-app-password');
    console.log('  EMAIL_FROM=Trips Management <noreply@domain.com>');
    process.exit(1);
  }

  console.log('\n='.repeat(60));
  console.log('\n🔌 Testing SMTP connection...\n');

  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Ask if user wants to send a test email
    console.log('📤 Sending test email...\n');

    const testEmail = {
      from: process.env.EMAIL_FROM || 'Trips Management <noreply@intersnack.com.vn>',
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: '✅ SMTP Test - Trips Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SMTP Test</title>
        </head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ SMTP Test Successful!</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; margin-top: 20px; border-radius: 8px;">
            <p style="font-size: 16px;">Xin chào,</p>

            <p>Đây là email test từ <strong>Trips Management System</strong>.</p>

            <p>Nếu bạn nhận được email này, nghĩa là cấu hình SMTP đã hoạt động chính xác!</p>

            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Cấu hình SMTP:</strong></p>
              <ul style="margin: 10px 0;">
                <li>Host: ${process.env.EMAIL_HOST}</li>
                <li>Port: ${process.env.EMAIL_PORT}</li>
                <li>User: ${process.env.EMAIL_USER}</li>
                <li>From: ${process.env.EMAIL_FROM}</li>
              </ul>
            </div>

            <p style="color: #16a34a; font-weight: bold;">
              ✅ Hệ thống email approval đã sẵn sàng sử dụng!
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

            <p style="font-size: 12px; color: #666; text-align: center;">
              Email test này được gửi từ Trips Management System<br>
              Thời gian: ${new Date().toLocaleString('vi-VN')}
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Recipient:', testEmail.to);
    console.log('\n📬 Please check your inbox to confirm email delivery.\n');
    console.log('='.repeat(60));
    console.log('\n✅ SMTP is ready for production use!\n');
  } catch (error) {
    console.error('\n❌ SMTP Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('  1. Wrong username or password');
    console.error('  2. App password not enabled (Gmail requires this)');
    console.error('  3. Less secure app access disabled');
    console.error('  4. Wrong SMTP host or port');
    console.error('  5. Firewall blocking SMTP port');
    console.error('\n');
    process.exit(1);
  }
}

testSMTP().catch(console.error);
