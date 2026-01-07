// scripts/verify-admin.js
// Verify admin users after profile setup

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verifyAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🔍 Checking admin users...\n');

  const [admins] = await connection.query(`
    SELECT
      email,
      name,
      role,
      admin_type,
      admin_location_id,
      profile_completed,
      admin_assigned_at
    FROM users
    WHERE role = 'admin' AND admin_type != 'none'
    ORDER BY admin_type DESC, email
  `);

  if (admins.length > 0) {
    console.log('👑 Admin Users:');
    console.table(admins);
  } else {
    console.log('⚠️  No admin users found');
  }

  console.log(`\nTotal admins: ${admins.length}`);

  await connection.end();
}

verifyAdmin().catch(console.error);
