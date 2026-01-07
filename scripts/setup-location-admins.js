// Script to setup location admins for 4 locations
const mysql = require('mysql2/promise');

const LOCATION_ADMINS = [
  {
    email: 'yen.pham@intersnack.com.vn',
    name: 'Yen Pham',
    location: 'Tay Ninh',
    locationId: 'loc-tay-ninh',
    role: 'Receptionist & Office Admin'
  },
  {
    email: 'nhung.cao@intersnack.com.vn',
    name: 'Nhung Cao',
    location: 'Phan Thiet',
    locationId: 'loc-phan-thiet',
    role: 'Receptionist & Office Admin'
  },
  {
    email: 'chi.huynh@intersnack.com.vn',
    name: 'Chi Huynh',
    location: 'Long An',
    locationId: 'loc-long-an',
    role: 'Receptionist & Office Admin'
  },
  {
    email: 'anh.do@intersnack.com.vn',
    name: 'Anh Do',
    location: 'Ho Chi Minh',
    locationId: 'loc-ho-chi-minh',
    role: 'PA cum Office Admin'
  }
];

async function setupLocationAdmins() {
  const conn = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('🎯 SETTING UP LOCATION ADMINS\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const performedBy = 'ngan.ngo@intersnack.com.vn';

    for (const admin of LOCATION_ADMINS) {
      console.log(`📍 Granting admin role to ${admin.email}...`);
      console.log(`   Location: ${admin.location} (${admin.locationId})`);
      console.log(`   Role: ${admin.role}\n`);

      // Check if user exists
      const [users] = await conn.query(
        'SELECT id, email, name, role, admin_type FROM users WHERE email = ?',
        [admin.email]
      );

      if (users.length === 0) {
        console.log(`   ⚠️  User ${admin.email} not found in database`);
        console.log(`   ℹ️  User must login first to create account\n`);
        continue;
      }

      const user = users[0];
      console.log(`   ✅ User found: ${user.name || user.email}`);

      // Check if already admin
      if (user.admin_type && user.admin_type !== 'none') {
        console.log(`   ℹ️  Already has admin role: ${user.admin_type}`);
        console.log(`   Skipping...\n`);
        continue;
      }

      // Grant admin role using stored procedure
      await conn.query(
        `CALL sp_grant_admin_role(?, ?, ?, ?, ?, ?, ?)`,
        [
          admin.email,
          'location_admin',
          admin.locationId,
          performedBy,
          `Location Admin - ${admin.role} (${admin.location})`,
          null, // IP address
          null  // User agent
        ]
      );

      console.log(`   ✅ Admin role granted successfully!\n`);
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('📊 VERIFICATION\n');

    // Get all location admins
    const [admins] = await conn.query(`
      SELECT
        u.email,
        u.name,
        u.admin_type,
        l.code as location_code,
        l.name as location_name
      FROM users u
      LEFT JOIN locations l ON u.admin_location_id = l.id
      WHERE u.admin_type = 'location_admin'
      ORDER BY l.code
    `);

    console.log('📍 LOCATION ADMINS:\n');
    if (admins.length === 0) {
      console.log('   ⚠️  No location admins found');
    } else {
      admins.forEach(a => {
        console.log(`   ✅ ${a.email.padEnd(40)} [${a.location_code} - ${a.location_name}]`);
      });
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 SETUP COMPLETE!\n');

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await conn.end();
    throw error;
  }
}

setupLocationAdmins().catch(console.error);
