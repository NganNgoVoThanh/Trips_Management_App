// scripts/verify-user-status.js
// Verify user profile status after manager confirmation

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyUserStatus() {
  try {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('\n=== User Profile Status ===\n');

    const [users] = await connection.query(
      `SELECT
        email,
        name,
        manager_email,
        pending_manager_email,
        manager_confirmed,
        manager_confirmed_at,
        profile_completed,
        role
      FROM users
      WHERE email = 'ngan.ngo@intersnack.com.vn'`
    );

    console.table(users);

    console.log('\n=== Manager Confirmations Status ===\n');

    const [confirmations] = await connection.query(
      `SELECT
        mc.id,
        mc.user_id,
        mc.manager_email,
        mc.confirmed,
        mc.confirmed_at,
        mc.created_at,
        mc.expires_at,
        u.email as user_email,
        u.name as user_name
      FROM manager_confirmations mc
      JOIN users u ON mc.user_id COLLATE utf8mb4_unicode_ci = u.id
      WHERE u.email = 'ngan.ngo@intersnack.com.vn'
      ORDER BY mc.created_at DESC
      LIMIT 1`
    );

    console.table(confirmations);

    if (users.length > 0) {
      const user = users[0];
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Profile Summary');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 User: ${user.name} (${user.email})`);
      console.log(`👔 Manager: ${user.manager_email || 'Not set'}`);
      console.log(`✅ Manager Confirmed: ${user.manager_confirmed ? 'YES' : 'NO'}`);
      console.log(`📋 Profile Completed: ${user.profile_completed ? 'YES' : 'NO'}`);
      console.log(`🎫 Can Submit Trips: ${user.manager_confirmed && user.profile_completed ? 'YES ✅' : 'NO ❌'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

verifyUserStatus();
