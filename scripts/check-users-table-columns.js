/**
 * Check if users table has all required columns for profile setup
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING USERS TABLE STRUCTURE');
  console.log('='.repeat(60) + '\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log(`📊 Database: ${process.env.DB_NAME}\n`);

    // Get table structure
    const [columns] = await connection.query(`
      DESCRIBE users
    `);

    console.log('Current columns in users table:\n');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Required columns for profile setup
    const requiredColumns = [
      'id',
      'email',
      'name',
      'department',
      'office_location',
      'employee_id',
      'phone',
      'pickup_address',
      'pickup_notes',
      'manager_email',
      'pending_manager_email',
      'manager_confirmed',
      'manager_confirmed_at',
      'profile_completed',
      'role',
      'admin_type',
      'admin_location_id',
      'admin_assigned_at',
      'admin_assigned_by',
      'emergency_contact',
      'emergency_phone',
      'preferred_vehicle',
      'preferred_departure_time',
      'status',
      'created_at',
      'updated_at'
    ];

    console.log('\n' + '='.repeat(60));
    console.log('📋 CHECKING REQUIRED COLUMNS\n');

    const existingColumns = columns.map(c => c.Field);
    const missingColumns = [];

    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      if (exists) {
        console.log(`✅ ${col}`);
      } else {
        console.log(`❌ ${col} - MISSING`);
        missingColumns.push(col);
      }
    });

    console.log('\n' + '='.repeat(60));

    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist!\n');
    } else {
      console.log(`❌ Missing ${missingColumns.length} columns:\n`);
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log('\n⚠️  You need to run migrations to add these columns.');
      console.log('Run: node scripts/fix-missing-profile-columns.js\n');
    }

    // Check sample users
    console.log('='.repeat(60));
    console.log('👥 SAMPLE USERS:\n');

    const [users] = await connection.query(`
      SELECT email, name, profile_completed, manager_confirmed, role, admin_type
      FROM users
      LIMIT 5
    `);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Profile Completed: ${user.profile_completed ? 'YES' : 'NO'}`);
      console.log(`   Manager Confirmed: ${user.manager_confirmed ? 'YES' : 'NO'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Admin Type: ${user.admin_type || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
