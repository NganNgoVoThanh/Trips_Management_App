// scripts/seed-initial-admins-v2.js
// Seed initial admin users vào database (Version 2 - Direct users table update)
// Run: node scripts/seed-initial-admins-v2.js

const mysql = require('mysql2/promise');
const path = require('path');

// Load .env.local if available
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Generate unique user ID (similar to user-service.ts)
function generateUserId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `user-${timestamp}-${random}`;
}

// Generate location ID from name
function generateLocationId(name) {
  return 'loc-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

const INITIAL_ADMINS = [
  {
    email: 'ngan.ngo@intersnack.com.vn',
    name: 'Ngan Ngo',
    admin_type: 'super_admin',
    location_name: null,
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
  console.log('🚀 Starting initial admin seeding (v2 - Direct users table)...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Check if locations table exists
    const [locationTables] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'locations'
    `, [process.env.DB_NAME]);

    const hasLocations = locationTables[0].count > 0;

    // Get existing locations if table exists
    let locationMap = new Map();
    if (hasLocations) {
      const [locations] = await connection.query(`
        SELECT id, name FROM locations WHERE active = TRUE
      `);

      console.log('📍 Available locations:');
      locations.forEach(loc => {
        locationMap.set(loc.name, loc.id);
        console.log(`   - ${loc.name} (ID: ${loc.id})`);
      });
      console.log('');
    } else {
      console.log('ℹ️  No locations table found, skipping location assignments\n');
    }

    // Seed each admin
    for (const admin of INITIAL_ADMINS) {
      console.log(`👤 Processing: ${admin.name} (${admin.email})`);

      // Check if user already exists
      const [existing] = await connection.query(`
        SELECT id, role, admin_type FROM users WHERE email = ?
      `, [admin.email]);

      let userId;
      let needsUpdate = false;

      if (existing.length > 0) {
        userId = existing[0].id;
        const currentRole = existing[0].role;
        const currentAdminType = existing[0].admin_type;

        console.log(`   ℹ️  User exists: role=${currentRole}, admin_type=${currentAdminType || 'none'}`);

        // Check if needs update
        if (currentRole !== 'admin' || currentAdminType !== admin.admin_type) {
          needsUpdate = true;
        }
      } else {
        // User doesn't exist, create new user
        console.log(`   ➕ Creating new user...`);

        userId = generateUserId();

        await connection.query(`
          INSERT INTO users (id, email, name, role, admin_type, profile_completed, created_at, updated_at)
          VALUES (?, ?, ?, 'admin', ?, FALSE, NOW(), NOW())
        `, [userId, admin.email, admin.name, admin.admin_type]);

        console.log(`   ✅ User created with ID: ${userId}`);
      }

      // Get location_id if location_admin
      let locationId = null;
      if (admin.admin_type === 'location_admin' && admin.location_name && hasLocations) {
        locationId = locationMap.get(admin.location_name);

        if (!locationId) {
          console.log(`   ⚠️  Location "${admin.location_name}" not found, creating...`);

          // Generate location ID
          locationId = generateLocationId(admin.location_name);
          const locationCode = admin.location_name.toUpperCase().replace(/ /g, '_');

          // Create location
          await connection.query(`
            INSERT INTO locations (id, name, code, active, created_at, updated_at)
            VALUES (?, ?, ?, TRUE, NOW(), NOW())
          `, [locationId, admin.location_name, locationCode]);

          locationMap.set(admin.location_name, locationId);
          console.log(`   ✅ Created location: ${admin.location_name} (ID: ${locationId})`);
        }
      }

      // Update user with admin permissions
      if (existing.length === 0 || needsUpdate) {
        await connection.query(`
          UPDATE users
          SET role = 'admin',
              admin_type = ?,
              admin_location_id = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [admin.admin_type, locationId, userId]);

        console.log(`   ✅ Granted ${admin.admin_type} permission${locationId ? ` for location ${locationId}` : ''}`);
      } else {
        console.log(`   ⏭️  No changes needed`);
      }

      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    const [adminCount] = await connection.query(`
      SELECT admin_type, COUNT(*) as count
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
      GROUP BY admin_type
    `);

    adminCount.forEach(row => {
      console.log(`   - ${row.admin_type}: ${row.count}`);
    });

    // List all admins
    console.log('\n📋 All current admins:');
    const [allAdmins] = await connection.query(`
      SELECT email, name, admin_type, admin_location_id
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
      ORDER BY admin_type, email
    `);

    allAdmins.forEach(admin => {
      const location = admin.admin_location_id ? ` (Location: ${admin.admin_location_id})` : '';
      console.log(`   - ${admin.email} | ${admin.name} | ${admin.admin_type}${location}`);
    });

    console.log('\n✅ Initial admin seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the app to clear auth cache');
    console.log('   2. Login with one of the admin emails above');
    console.log('   3. Verify admin access to /admin pages');

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
