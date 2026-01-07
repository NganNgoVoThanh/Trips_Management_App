const mysql = require('mysql2/promise');

async function checkAdminRole() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('📊 Checking admin users...\n');

  // Check users table
  const [users] = await connection.query(
    'SELECT email, name, role, admin_type FROM users WHERE role = ? OR admin_type IS NOT NULL',
    ['admin']
  );

  console.log('✅ Admin users in database:');
  console.table(users);

  // Check your specific email
  const testEmail = 'ngan.ngo@intersnack.com.vn';
  const [yourUser] = await connection.query(
    'SELECT email, name, role, admin_type, profile_completed FROM users WHERE email = ?',
    [testEmail]
  );

  console.log(`\n🔍 Your user (${testEmail}):`);
  console.table(yourUser);

  await connection.end();
}

checkAdminRole().catch(console.error);
