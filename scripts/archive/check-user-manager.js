// scripts/check-user-manager.js
// Check user manager status

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkUserManager() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const userEmail = process.argv[2] || 'ngan.ngo@intersnack.com.vn';

    console.log('\n=== Checking User Manager Status ===\n');
    console.log(`User: ${userEmail}\n`);

    const [users] = await connection.query(
      `SELECT
        id,
        email,
        name,
        manager_email,
        manager_name,
        pending_manager_email,
        manager_confirmed,
        manager_confirmed_at,
        profile_completed
      FROM users
      WHERE email = ?`,
      [userEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found!');
      await connection.end();
      return;
    }

    console.table(users);

    const user = users[0];
    console.log('\n📊 Manager Status Analysis:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`manager_email: ${user.manager_email || 'NULL ❌'}`);
    console.log(`manager_name: ${user.manager_name || 'NULL ❌'}`);
    console.log(`pending_manager_email: ${user.pending_manager_email || 'NULL'}`);
    console.log(`manager_confirmed: ${user.manager_confirmed ? 'YES ✅' : 'NO ❌'}`);
    console.log(`profile_completed: ${user.profile_completed ? 'YES ✅' : 'NO ❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!user.manager_email || !user.manager_name) {
      console.log('\n⚠️ ISSUE FOUND: manager_email or manager_name is NULL!');
      console.log('📌 This causes:');
      console.log('   - Auto-approval (no manager to approve)');
      console.log('   - NO EMAIL sent to manager');
      console.log('   - Trip status: "approved" immediately');
      console.log('\n💡 Solution: User needs to set manager in profile setup');
    } else {
      console.log('\n✅ Manager info exists - emails SHOULD be sent');
      console.log(`📧 Email will be sent to: ${user.manager_email} (${user.manager_name})`);
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

checkUserManager();
