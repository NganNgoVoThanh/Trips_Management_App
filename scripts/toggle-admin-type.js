// scripts/toggle-admin-type.js
// Script to temporarily toggle admin type for testing

const mysql = require('mysql2/promise');
require('dotenv').config();

const LOCATIONS = {
  'TAY_NINH': 'tay-ninh-factory',
  'PHAN_THIET': 'phan-thiet-factory',
  'LONG_AN': 'long-an-factory',
  'HCM': 'hcm-office',
};

async function toggleAdminType(email, toType, locationCode) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Get current state
    const [rows] = await connection.query(
      'SELECT id, email, name, admin_type, admin_location_id FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      console.log('❌ User not found:', email);
      return;
    }

    const user = rows[0];
    console.log('\n📋 Current State:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Admin Type:', user.admin_type);
    console.log('  Location ID:', user.admin_location_id || 'null');

    if (toType === 'revert') {
      // Revert to super_admin
      await connection.query(
        `UPDATE users
         SET admin_type = 'super_admin',
             admin_location_id = NULL
         WHERE email = ?`,
        [email]
      );
      console.log('\n✅ Reverted to Super Admin');
    } else if (toType === 'location_admin') {
      // Change to location admin
      if (!locationCode || !LOCATIONS[locationCode]) {
        console.log('\n❌ Invalid location code. Available:', Object.keys(LOCATIONS).join(', '));
        return;
      }

      const locationId = LOCATIONS[locationCode];

      await connection.query(
        `UPDATE users
         SET admin_type = 'location_admin',
             admin_location_id = ?
         WHERE email = ?`,
        [locationId, email]
      );
      console.log('\n✅ Changed to Location Admin');
      console.log('  Location:', locationCode, '→', locationId);
    } else {
      console.log('❌ Invalid type. Use "location_admin" or "revert"');
      return;
    }

    // Show new state
    const [newRows] = await connection.query(
      'SELECT admin_type, admin_location_id FROM users WHERE email = ?',
      [email]
    );

    console.log('\n📋 New State:');
    console.log('  Admin Type:', newRows[0].admin_type);
    console.log('  Location ID:', newRows[0].admin_location_id || 'null');

    console.log('\n⚠️  Remember to:');
    console.log('  1. Sign out and sign in again to refresh the session');
    console.log('  2. Revert back after testing with: npm run toggle-admin revert');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Parse command line args
const args = process.argv.slice(2);
const email = args[0] || 'ngan.ngo@intersnack.com.vn';
const toType = args[1] || 'location_admin';
const locationCode = args[2] || 'TAY_NINH';

console.log('🔄 Toggling Admin Type...\n');

if (!args[1]) {
  console.log('Usage: node toggle-admin-type.js <email> <type> [location]');
  console.log('  type: "location_admin" or "revert"');
  console.log('  location: TAY_NINH, PHAN_THIET, LONG_AN, HCM\n');
  console.log('Using defaults:', email, toType, locationCode, '\n');
}

toggleAdminType(email, toType, locationCode);
