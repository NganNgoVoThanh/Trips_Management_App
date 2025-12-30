// scripts/test-o365-smtp.js
// Quick test for Office 365 SMTP with detailed diagnostics

const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function testO365SMTP() {
  console.log('\n🔧 Office 365 / Outlook SMTP Test Tool\n');
  console.log('='.repeat(70));

  // Get credentials interactively
  const emailUser = await ask('\n📧 Nhập email Office 365 của bạn: ');
  const emailPass = await ask('🔑 Nhập password (hoặc App Password nếu có MFA): ');
  const testRecipient = await ask('📬 Gửi test email đến (để trống = gửi cho chính mình): ');

  const recipient = testRecipient.trim() || emailUser;

  console.log('\n' + '='.repeat(70));
  console.log('\n⚙️  Cấu hình SMTP:\n');
  console.log('  Host: smtp.office365.com');
  console.log('  Port: 587');
  console.log('  User:', emailUser);
  console.log('  Pass:', '*'.repeat(emailPass.length));
  console.log('  Test recipient:', recipient);

  console.log('\n' + '='.repeat(70));
  console.log('\n🔌 Bước 1: Kiểm tra kết nối SMTP...\n');

  try {
    const transporter = nodemailer.createTransporter({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
    });

    console.log('⏳ Đang kết nối đến smtp.office365.com:587...\n');
    await transporter.verify();
    console.log('\n✅ Kết nối SMTP thành công!\n');

    console.log('='.repeat(70));
    console.log('\n📤 Bước 2: Gửi test email...\n');

    const mailOptions = {
      from: `Trips Management System <${emailUser}>`,
      to: recipient,
      subject: '✅ Test Email - Office 365 SMTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%); padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ SMTP Test Successful!</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; margin-top: 20px; border-radius: 8px;">
            <p style="font-size: 16px;">Xin chào,</p>
            <p>Đây là email test từ <strong>Trips Management System</strong> qua Office 365 SMTP.</p>

            <div style="background: #f0f9ff; border-left: 4px solid #0078d4; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>✅ Cấu hình thành công:</strong></p>
              <ul style="margin: 10px 0;">
                <li>SMTP Host: smtp.office365.com</li>
                <li>Port: 587 (STARTTLS)</li>
                <li>From: ${emailUser}</li>
                <li>Thời gian: ${new Date().toLocaleString('vi-VN')}</li>
              </ul>
            </div>

            <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 4px; padding: 16px; margin-top: 20px;">
              <p style="margin: 0; color: #155724;">
                <strong>🎉 Email approval system đã sẵn sàng!</strong><br>
                Bạn có thể sử dụng cấu hình này cho production.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
              Email test từ Trips Management System<br>
              Powered by Office 365 SMTP
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email đã được gửi thành công!\n');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Recipient:', recipient);

    console.log('\n' + '='.repeat(70));
    console.log('\n📬 Vui lòng kiểm tra inbox của', recipient);
    console.log('   (Kiểm tra cả Junk/Spam folder nếu không thấy)\n');

    console.log('='.repeat(70));
    console.log('\n✅ THÀNH CÔNG! Cấu hình SMTP đã hoạt động!\n');
    console.log('👉 Bước tiếp theo: Copy thông tin vào .env.local:\n');
    console.log('   EMAIL_HOST=smtp.office365.com');
    console.log('   EMAIL_PORT=587');
    console.log(`   EMAIL_USER=${emailUser}`);
    console.log(`   EMAIL_PASSWORD=${emailPass}`);
    console.log(`   EMAIL_FROM=Trips Management System <${emailUser}>\n`);

  } catch (error) {
    console.error('\n❌ SMTP Test thất bại!\n');
    console.error('Error:', error.message);
    console.error('\nChi tiết lỗi:\n', error);

    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 PHÂN TÍCH LỖI:\n');

    if (error.code === 'EAUTH') {
      console.log('❌ Lỗi xác thực (Authentication Failed)\n');
      console.log('Nguyên nhân có thể:');
      console.log('  1. Sai username hoặc password');
      console.log('  2. Account có MFA/2FA enabled → Cần App Password');
      console.log('  3. SMTP Auth bị disabled → Cần IT enable\n');
      console.log('Giải pháp:');
      console.log('  → Kiểm tra lại username/password');
      console.log('  → Nếu có MFA, cần tạo App Password (liên hệ IT)');
      console.log('  → Yêu cầu IT enable SMTP Authentication\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('❌ Lỗi kết nối (Connection Failed)\n');
      console.log('Nguyên nhân có thể:');
      console.log('  1. Firewall block port 587');
      console.log('  2. Network không cho phép SMTP');
      console.log('  3. Proxy/VPN blocking\n');
      console.log('Giải pháp:');
      console.log('  → Thử kết nối từ network khác');
      console.log('  → Yêu cầu IT mở port 587 outbound');
      console.log('  → Tắt VPN/Proxy và thử lại\n');
    } else if (error.responseCode === 535) {
      console.log('❌ Lỗi 535: Authentication Failed\n');
      console.log('Account có MFA/2FA hoặc SMTP Auth disabled.\n');
      console.log('Giải pháp:');
      console.log('  → Liên hệ IT để enable SMTP Auth');
      console.log('  → Hoặc tạo App Password nếu có MFA\n');
    } else {
      console.log('❌ Lỗi khác:', error.code || 'Unknown');
      console.log('\nVui lòng liên hệ IT support với thông tin lỗi này.\n');
    }

    console.log('='.repeat(70) + '\n');
  }

  rl.close();
}

testO365SMTP().catch(console.error);
