// Test database connection and verify schema
// Run this on production server to check if migration was applied correctly

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and schema...\n');

  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Database connection successful!');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT || '3306'}`);
    console.log(`   Database: ${process.env.DB_NAME}\n`);

    // Check users table columns
    console.log('📋 Checking users table columns...');
    const [userColumns] = await connection.query(
      `SELECT COLUMN_NAME
       FROM information_schema.columns
       WHERE table_schema = ?
       AND table_name = 'users'
       AND column_name IN ('admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by')`,
      [process.env.DB_NAME]
    );

    const requiredColumns = ['admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by'];
    const foundColumns = userColumns.map(row => row.COLUMN_NAME);

    requiredColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING!`);
      }
    });

    // Check if all columns exist
    if (foundColumns.length === requiredColumns.length) {
      console.log('\n✅ All required columns exist in users table');
    } else {
      console.log(`\n❌ Missing ${requiredColumns.length - foundColumns.length} columns in users table`);
      console.log('   → Migration NOT applied on this database!');
      console.log('   → Run PRODUCTION_MIGRATION_COMPLETE.sql on production database');
      process.exit(1);
    }

    // Check tables
    console.log('\n📋 Checking required tables...');
    const [tables] = await connection.query(
      `SELECT TABLE_NAME
       FROM information_schema.tables
       WHERE table_schema = ?
       AND table_name IN ('locations', 'temp_trips', 'pending_admin_assignments', 'admin_audit_log')`,
      [process.env.DB_NAME]
    );

    const requiredTables = ['locations', 'temp_trips', 'pending_admin_assignments', 'admin_audit_log'];
    const foundTables = tables.map(row => row.TABLE_NAME);

    requiredTables.forEach(table => {
      if (foundTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING!`);
      }
    });

    if (foundTables.length === requiredTables.length) {
      console.log('\n✅ All required tables exist');
    } else {
      console.log(`\n❌ Missing ${requiredTables.length - foundTables.length} tables`);
      console.log('   → Migration NOT applied on this database!');
      process.exit(1);
    }

    // Check stored procedures
    console.log('\n📋 Checking stored procedures...');
    const [procedures] = await connection.query(
      `SELECT ROUTINE_NAME
       FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role')`,
      [process.env.DB_NAME]
    );

    const requiredProcs = ['sp_grant_admin_role', 'sp_revoke_admin_role'];
    const foundProcs = procedures.map(row => row.ROUTINE_NAME);

    requiredProcs.forEach(proc => {
      if (foundProcs.includes(proc)) {
        console.log(`   ✅ ${proc}`);
      } else {
        console.log(`   ❌ ${proc} - MISSING!`);
      }
    });

    // Test a simple query
    console.log('\n📋 Testing sample query...');
    const [users] = await connection.query(
      'SELECT email, admin_type, admin_location_id FROM users LIMIT 1'
    );
    console.log('   ✅ Query executed successfully');
    if (users.length > 0) {
      console.log(`   Sample user: ${users[0].email}`);
    }

    await connection.end();

    console.log('\n========================================');
    console.log('✅ ALL CHECKS PASSED!');
    console.log('========================================');
    console.log('Database is ready for profile setup.');
    console.log('If still getting 500 error, check:');
    console.log('1. Application server logs');
    console.log('2. Restart application server');
    console.log('3. Clear application cache');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Check:');
      console.error('   - MySQL service is running');
      console.error('   - DB_HOST and DB_PORT in .env are correct');
      console.error('   - Firewall allows connection');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Check:');
      console.error('   - DB_USER and DB_PASSWORD in .env are correct');
      console.error('   - User has permissions on database');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database not found. Check:');
      console.error('   - DB_NAME in .env is correct');
      console.error('   - Database exists on server');
    }

    console.error('\n.env file location:', require('path').resolve('.env'));
    process.exit(1);
  }
}

testDatabaseConnection();
