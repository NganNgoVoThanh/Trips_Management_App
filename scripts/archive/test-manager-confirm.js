// scripts/test-manager-confirm.js
// Simulate manager confirmation for local testing

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testManagerConfirm() {
  const action = process.argv[2]; // 'confirm' or 'reject'
  const managerEmail = process.argv[3];

  if (!action || !managerEmail) {
    console.error('\n❌ Usage: node scripts/test-manager-confirm.js <confirm|reject> <manager-email>');
    console.error('❌ Example: node scripts/test-manager-confirm.js confirm dieu.le@intersnack.com.vn\n');
    process.exit(1);
  }

  if (action !== 'confirm' && action !== 'reject') {
    console.error('❌ Action must be "confirm" or "reject"');
    process.exit(1);
  }

  console.log('\n=== Manager Confirmation Test ===\n');
  console.log(`📧 Manager Email: ${managerEmail}`);
  console.log(`✅ Action: ${action.toUpperCase()}`);
  console.log('');

  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Find latest confirmation for this manager
    console.log('🔍 Step 1: Finding latest confirmation...');
    const [confirmations] = await connection.query(
      `SELECT mc.*, u.email as user_email, u.name as user_name
       FROM manager_confirmations mc
       JOIN users u ON mc.user_id COLLATE utf8mb4_unicode_ci = u.id
       WHERE mc.manager_email COLLATE utf8mb4_unicode_ci = ?
         AND mc.confirmed = FALSE
       ORDER BY mc.created_at DESC
       LIMIT 1`,
      [managerEmail]
    );

    if (confirmations.length === 0) {
      console.error('❌ No pending confirmation found for this manager');
      await connection.end();
      process.exit(1);
    }

    const confirmation = confirmations[0];
    console.log(`✅ Found confirmation for: ${confirmation.user_name} (${confirmation.user_email})`);
    console.log(`   Token: ${confirmation.token.substring(0, 20)}...`);
    console.log(`   Expires: ${confirmation.expires_at}`);
    console.log('');

    // Check if expired
    if (new Date() > new Date(confirmation.expires_at)) {
      console.error('❌ This confirmation has expired');
      await connection.end();
      process.exit(1);
    }

    if (action === 'confirm') {
      console.log('✅ Step 2: CONFIRMING manager relationship...');

      // Get manager's name from users table
      const [managerRows] = await connection.query(
        `SELECT name FROM users WHERE email = ?`,
        [confirmation.manager_email]
      );
      const managerName = managerRows.length > 0 ? managerRows[0].name : null;

      // Update user's manager (set both email AND name)
      await connection.query(
        `UPDATE users
         SET manager_email = ?,
             manager_name = ?,
             manager_confirmed = TRUE,
             manager_confirmed_at = NOW(),
             pending_manager_email = NULL,
             manager_change_requested_at = NULL
         WHERE id = ?`,
        [confirmation.manager_email, managerName, confirmation.user_id]
      );

      // Mark confirmation as completed
      await connection.query(
        `UPDATE manager_confirmations
         SET confirmed = TRUE, confirmed_at = NOW()
         WHERE id = ?`,
        [confirmation.id]
      );

      console.log('✅ Manager relationship confirmed!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS - Manager Confirmed!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log(`📧 User (${confirmation.user_email}) can now:`);
      console.log('   ✅ Submit trip requests');
      console.log('   ✅ Manager will receive approval notifications');
      console.log('');

    } else {
      console.log('❌ Step 2: REJECTING manager relationship...');

      // Delete confirmation
      await connection.query(
        `DELETE FROM manager_confirmations WHERE id = ?`,
        [confirmation.id]
      );

      // Reset user's pending manager
      await connection.query(
        `UPDATE users
         SET pending_manager_email = NULL,
             manager_confirmed = FALSE
         WHERE id = ?`,
        [confirmation.user_id]
      );

      console.log('❌ Manager relationship rejected!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ REJECTED - Manager Declined');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log(`📧 User (${confirmation.user_email}) needs to:`);
      console.log('   ⚠️  Select a different manager');
      console.log('   ⚠️  Cannot submit trips until manager confirms');
      console.log('');
    }

    await connection.end();

    console.log('📝 Next Steps:');
    console.log('1. Refresh browser');
    console.log('2. Login as user to see updated status');
    console.log('3. Check dashboard for confirmation status');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

testManagerConfirm();
