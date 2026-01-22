// scripts/check-admin-status.js
// Check and fix admin status in database

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAndFixAdminStatus() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database\n');

    // 1. Check all users with admin role
    console.log('📋 Checking users with role = "admin"...');
    const [admins] = await connection.query(`
      SELECT email, name, role, admin_type, admin_location_id, admin_assigned_at
      FROM users
      WHERE role = 'admin'
      ORDER BY email
    `);

    console.log(`Found ${admins.length} users with role='admin':`);
    admins.forEach(admin => {
      console.log(`  - ${admin.email}: admin_type=${admin.admin_type || 'NULL'}, location=${admin.admin_location_id || 'N/A'}`);
    });

    // 2. Check users who have role='admin' but admin_type is NULL or 'none'
    console.log('\n📋 Checking admins with missing admin_type...');
    const [missingType] = await connection.query(`
      SELECT email, name, role, admin_type
      FROM users
      WHERE role = 'admin' AND (admin_type IS NULL OR admin_type = 'none' OR admin_type = '')
    `);

    if (missingType.length > 0) {
      console.log(`⚠️  Found ${missingType.length} admins with missing admin_type:`);
      missingType.forEach(admin => {
        console.log(`  - ${admin.email} (current admin_type: ${admin.admin_type || 'NULL'})`);
      });

      // Ask to fix
      console.log('\n🔧 Fixing: Setting admin_type to "super_admin" for these users...');
      for (const admin of missingType) {
        await connection.query(
          `UPDATE users SET admin_type = 'super_admin', admin_assigned_at = NOW() WHERE email = ?`,
          [admin.email]
        );
        console.log(`  ✅ Fixed: ${admin.email} → super_admin`);
      }
    } else {
      console.log('✅ All admins have valid admin_type');
    }

    // 3. Check specific user (ngan.ngo@intersnack.com.vn)
    const targetEmail = 'ngan.ngo@intersnack.com.vn';
    console.log(`\n📋 Checking specific user: ${targetEmail}`);
    const [targetUser] = await connection.query(
      `SELECT id, email, name, role, admin_type, admin_location_id FROM users WHERE email = ?`,
      [targetEmail]
    );

    if (targetUser.length > 0) {
      const user = targetUser[0];
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Admin Type: ${user.admin_type || 'NULL'}`);
      console.log(`  Location ID: ${user.admin_location_id || 'N/A'}`);

      if (user.role !== 'admin' || user.admin_type !== 'super_admin') {
        console.log('\n🔧 Updating user to super_admin...');
        await connection.query(
          `UPDATE users SET role = 'admin', admin_type = 'super_admin', admin_assigned_at = NOW() WHERE email = ?`,
          [targetEmail]
        );
        console.log(`✅ Updated ${targetEmail} to super_admin`);
      } else {
        console.log('✅ User already has super_admin status');
      }
    } else {
      console.log(`❌ User not found: ${targetEmail}`);
    }

    // 4. Final verification
    console.log('\n📋 Final admin list:');
    const [finalAdmins] = await connection.query(`
      SELECT email, admin_type, admin_location_id
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
      ORDER BY admin_type, email
    `);

    finalAdmins.forEach(admin => {
      const typeLabel = admin.admin_type === 'super_admin' ? '🔷 Super Admin' : '🔶 Location Admin';
      const location = admin.admin_location_id ? ` (${admin.admin_location_id})` : '';
      console.log(`  ${typeLabel}: ${admin.email}${location}`);
    });

    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
checkAndFixAdminStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
