// scripts/fix-manager-name.js
// Fix missing manager_name in users table

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function fixManagerName() {
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

    console.log('\n=== Fixing manager_name ===\n');
    console.log(`User: ${userEmail}`);

    // Get user's current manager email
    const [users] = await connection.query(
      'SELECT manager_email FROM users WHERE email = ?',
      [userEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found');
      await connection.end();
      return;
    }

    const managerEmail = users[0].manager_email;
    if (!managerEmail) {
      console.log('❌ User has no manager_email set');
      await connection.end();
      return;
    }

    console.log(`Manager email: ${managerEmail}`);

    // Get manager's name
    const [managers] = await connection.query(
      'SELECT name FROM users WHERE email = ?',
      [managerEmail]
    );

    if (managers.length === 0) {
      console.log(`❌ Manager ${managerEmail} not found in database`);
      await connection.end();
      return;
    }

    const managerName = managers[0].name;
    console.log(`Manager name: ${managerName}`);

    // Update user with manager_name
    const [result] = await connection.query(
      'UPDATE users SET manager_name = ? WHERE email = ?',
      [managerName, userEmail]
    );

    console.log(`\n✅ Updated manager_name successfully`);
    console.log(`Rows affected: ${result.affectedRows}`);

    // Verify
    const [updated] = await connection.query(
      'SELECT manager_email, manager_name FROM users WHERE email = ?',
      [userEmail]
    );

    console.log('\n📊 Updated record:');
    console.table(updated);

    await connection.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

fixManagerName();
