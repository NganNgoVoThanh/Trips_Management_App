// scripts/fix-yen-pham-location.js
// Fix Yen Pham location assignment to Tay Ninh Factory

const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function fixYenPhamLocation() {
  console.log('🔧 Fixing Yen Pham location assignment...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Check current status
    console.log('📋 Current status of yen.pham:');
    const [before] = await connection.query(`
      SELECT email, name, admin_type, admin_location_id
      FROM users WHERE email = 'yen.pham@intersnack.com.vn'
    `);
    console.table(before);

    // Get all Tay Ninh locations
    const [locations] = await connection.query(`
      SELECT id, name FROM locations
      WHERE name LIKE '%Tay Ninh%' OR name LIKE '%Tây Ninh%'
      ORDER BY created_at DESC
    `);

    console.log('\n📍 Available Tay Ninh locations:');
    console.table(locations);

    if (locations.length === 0) {
      console.log('❌ No Tay Ninh location found!');
      await connection.end();
      return;
    }

    // Use the first one (most recent)
    const locationId = locations[0].id;
    console.log(`\n✅ Using location: ${locations[0].name} (ID: ${locationId})`);

    // Update yen.pham with location
    await connection.query(`
      UPDATE users
      SET admin_location_id = ?,
          updated_at = NOW()
      WHERE email = 'yen.pham@intersnack.com.vn'
    `, [locationId]);

    console.log(`\n✅ Updated yen.pham@intersnack.com.vn with location: ${locationId}`);

    // Verify update
    console.log('\n📋 After update:');
    const [after] = await connection.query(`
      SELECT email, name, admin_type, admin_location_id
      FROM users WHERE email = 'yen.pham@intersnack.com.vn'
    `);
    console.table(after);

    // Show all admins now
    console.log('\n📊 All current admins:');
    const [allAdmins] = await connection.query(`
      SELECT email, name, admin_type, admin_location_id
      FROM users
      WHERE role = 'admin' AND admin_type IN ('super_admin', 'location_admin')
      ORDER BY admin_type, email
    `);
    console.table(allAdmins);

    console.log('\n✅ Fix completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixYenPhamLocation()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fixYenPhamLocation };
