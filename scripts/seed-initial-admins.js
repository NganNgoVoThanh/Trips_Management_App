// scripts/seed-initial-admins.js
// Seed initial admin users vào database
// Run: node scripts/seed-initial-admins.js

const mysql = require('mysql2/promise');
const path = require('path');

// Load .env.local if available, otherwise .env
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const INITIAL_ADMINS = [
  {
    email: 'ngan.ngo@intersnack.com.vn',
    name: 'Ngan Ngo',
    admin_type: 'super_admin',
    location_id: null,
    title: 'Development Application',
  },
  {
    email: 'yen.pham@intersnack.com.vn',
    name: 'Yen Pham',
    admin_type: 'location_admin',
    location_name: 'Tay Ninh Factory',
    title: 'Office Admin - Tay Ninh',
  },
  {
    email: 'nhung.cao@intersnack.com.vn',
    name: 'Nhung Cao',
    admin_type: 'location_admin',
    location_name: 'Phan Thiet Factory',
    title: 'Office Admin - Phan Thiet',
  },
  {
    email: 'chi.huynh@intersnack.com.vn',
    name: 'Chi Huynh',
    admin_type: 'location_admin',
    location_name: 'Long An Factory',
    title: 'Office Admin - Long An',
  },
  {
    email: 'anh.do@intersnack.com.vn',
    name: 'Anh Do',
    admin_type: 'location_admin',
    location_name: 'Ho Chi Minh Office',
    title: 'PA cum Office Admin - HCM',
  },
];

async function seedInitialAdmins() {
  console.log('🚀 Starting initial admin seeding...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Check if admin_roles table exists
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'admin_roles'
    `, [process.env.DB_NAME]);

    if (tables[0].count === 0) {
      console.log('❌ Error: admin_roles table does not exist!');
      console.log('💡 Please run the admin setup migration first.');
      process.exit(1);
    }

    // Get location IDs from database
    const [locations] = await connection.query(`
      SELECT id, name FROM locations WHERE active = TRUE
    `);

    const locationMap = new Map();
    locations.forEach(loc => {
      locationMap.set(loc.name, loc.id);
    });

    console.log('📍 Available locations:');
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (ID: ${loc.id})`);
    });
    console.log('');

    // Seed each admin
    for (const admin of INITIAL_ADMINS) {
      console.log(`👤 Processing: ${admin.name} (${admin.email})`);

      // Check if already exists
      const [existing] = await connection.query(`
        SELECT id FROM admin_roles
        WHERE user_email = ? AND revoked_at IS NULL
      `, [admin.email]);

      if (existing.length > 0) {
        console.log(`   ⏭️  Already exists, skipping...`);
        continue;
      }

      // Get location_id if location_admin
      let locationId = null;
      if (admin.admin_type === 'location_admin' && admin.location_name) {
        locationId = locationMap.get(admin.location_name);
        if (!locationId) {
          console.log(`   ⚠️  Warning: Location "${admin.location_name}" not found, creating...`);

          // Create location if not exists
          const [result] = await connection.query(`
            INSERT INTO locations (name, code, active)
            VALUES (?, ?, TRUE)
          `, [admin.location_name, admin.location_name.toUpperCase().replace(/ /g, '_')]);

          locationId = result.insertId;
          console.log(`   ✅ Created location: ${admin.location_name} (ID: ${locationId})`);
        }
      }

      // Insert into admin_roles
      await connection.query(`
        INSERT INTO admin_roles (user_email, admin_type, location_id, granted_by, granted_at)
        VALUES (?, ?, ?, 'system', NOW())
      `, [admin.email, admin.admin_type, locationId]);

      console.log(`   ✅ Granted ${admin.admin_type} permission`);

      // Update users table if user exists
      const [users] = await connection.query(`
        SELECT id FROM users WHERE email = ?
      `, [admin.email]);

      if (users.length > 0) {
        await connection.query(`
          UPDATE users
          SET role = 'admin',
              admin_type = ?,
              admin_location_id = ?
          WHERE email = ?
        `, [admin.admin_type, locationId, admin.email]);

        console.log(`   ✅ Updated user record`);
      } else {
        console.log(`   ℹ️  User not yet in system (will be created on first login)`);
      }

      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    const [adminCount] = await connection.query(`
      SELECT admin_type, COUNT(*) as count
      FROM admin_roles
      WHERE revoked_at IS NULL
      GROUP BY admin_type
    `);

    adminCount.forEach(row => {
      console.log(`   - ${row.admin_type}: ${row.count}`);
    });

    console.log('\n✅ Initial admin seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Remove hardcoded ADMIN_EMAILS from code');
    console.log('   2. Update middleware to read from database');
    console.log('   3. Test admin login with seeded accounts');

  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedInitialAdmins()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seedInitialAdmins };
