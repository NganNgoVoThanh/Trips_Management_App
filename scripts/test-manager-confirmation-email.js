// scripts/test-manager-confirmation-email.js
// Test sending manager confirmation email manually

require('dotenv').config({ path: '.env.local' });

async function testManagerConfirmationEmail() {
  console.log('🧪 TESTING MANAGER CONFIRMATION EMAIL\n');
  console.log('=' .repeat(80));

  // Import email service
  const { graphEmailService } = await import('../lib/microsoft-graph-email.ts');

  // Test data
  const testData = {
    managerEmail: 'ngan.ngo@intersnack.com.vn', // Send to yourself for testing
    userName: 'Test User',
    userEmail: 'test.user@intersnack.com.vn',
    confirmUrl: 'http://localhost:50001/api/manager/confirm?token=TEST123&action=confirm',
    rejectUrl: 'http://localhost:50001/api/manager/confirm?token=TEST123&action=reject',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };

  console.log('\n📧 Sending test manager confirmation email...\n');
  console.log('   To:', testData.managerEmail);
  console.log('   User:', testData.userName);
  console.log('   User Email:', testData.userEmail);
  console.log('   Expires:', testData.expiresAt.toLocaleString());

  try {
    await graphEmailService.sendManagerConfirmation(testData);

    console.log('\n✅ Manager confirmation email sent successfully!');
    console.log('   Check inbox:', testData.managerEmail);
    console.log('   Subject: Action Required: Manager Confirmation for Test User');

  } catch (error) {
    console.error('\n❌ Failed to send email:', error.message);
    console.error(error);
  }

  console.log('\n' + '=' .repeat(80));
}

// Run test
testManagerConfirmationEmail()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
