// scripts/reset-user-profile.js
// Reset user profile for testing manager confirmation flow

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function resetUserProfile() {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('❌ Usage: node scripts/reset-user-profile.js <email>');
    console.error('❌ Example: node scripts/reset-user-profile.js ngan.ngo@intersnack.com.vn');
    process.exit(1);
  }

  console.log('\n=== Reset User Profile for Testing ===\n');
  console.log(`📧 User Email: ${userEmail}`);
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

    console.log('🔍 Step 1: Checking user...');

    // Get user
    const [users] = await connection.query(
      'SELECT id, email, name, pending_manager_email, manager_email FROM users WHERE email = ?',
      [userEmail]
    );

    if (users.length === 0) {
      console.error(`❌ User not found: ${userEmail}`);
      await connection.end();
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.name} (${user.id})`);
    console.log(`   Current manager: ${user.manager_email || 'none'}`);
    console.log(`   Pending manager: ${user.pending_manager_email || 'none'}`);
    console.log('');

    // Delete manager confirmations
    console.log('🗑️  Step 2: Deleting old manager confirmations...');
    const [deleteResult] = await connection.query(
      'DELETE FROM manager_confirmations WHERE user_id = ?',
      [user.id]
    );
    console.log(`✅ Deleted ${deleteResult.affectedRows} confirmation(s)`);
    console.log('');

    // Reset user profile
    console.log('🔄 Step 3: Resetting user profile...');
    await connection.query(
      `UPDATE users
       SET pending_manager_email = NULL,
           manager_email = NULL,
           manager_confirmed = FALSE,
           manager_confirmed_at = NULL,
           manager_change_requested_at = NULL,
           profile_completed = FALSE
       WHERE email = ?`,
      [userEmail]
    );
    console.log('✅ Profile reset to initial state');
    console.log('');

    await connection.end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS - User Profile Reset Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Refresh browser (Ctrl + Shift + R)');
    console.log('2. Logout and login again');
    console.log('3. Go to /profile/setup');
    console.log('4. Fill in profile information');
    console.log('5. Select manager and submit');
    console.log('6. Check manager\'s inbox for confirmation email');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

resetUserProfile();
