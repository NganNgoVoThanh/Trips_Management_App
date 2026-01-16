#!/usr/bin/env node
/**
 * Database Verification Script
 * Run: node scripts/verify-database.js
 *
 * Checks:
 * 1. Database connection
 * 2. All required tables exist
 * 3. Required columns exist
 * 4. trips.status ENUM has all values
 * 5. Data counts
 */

require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');

// Required tables and their essential columns
const REQUIRED_TABLES = {
  users: ['id', 'email', 'name', 'role', 'manager_email', 'profile_completed', 'status'],
  trips: ['id', 'user_id', 'user_email', 'departure_location', 'destination', 'status', 'manager_approval_status'],
  optimization_groups: ['id', 'trips', 'status', 'estimated_savings'],
  join_requests: ['id', 'trip_id', 'requester_email', 'status'],
  vehicles: ['id', 'name', 'type', 'capacity'],
  approval_audit_log: ['id', 'trip_id', 'action', 'actor_email'],
  admin_override_log: ['id', 'trip_id', 'action_type', 'admin_email'],
  manager_confirmations: ['id', 'user_email', 'confirmation_token'],
  azure_ad_users_cache: ['id', 'azure_id', 'email', 'display_name']
};

// Expected trip status values
const EXPECTED_STATUSES = [
  'pending_approval', 'pending_urgent', 'auto_approved',
  'approved', 'approved_solo', 'optimized',
  'rejected', 'cancelled', 'expired'
];

async function main() {
  console.log('\n========================================');
  console.log('   TRIPS MANAGEMENT SYSTEM');
  console.log('   Database Verification');
  console.log('========================================\n');

  // 1. Check environment variables
  console.log('1. Checking environment variables...\n');

  const envVars = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT || '3306',
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
    DB_NAME: process.env.DB_NAME
  };

  let missingEnv = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value === undefined) {
      missingEnv.push(key);
      console.log(`   ❌ ${key}: NOT SET`);
    } else {
      console.log(`   ✅ ${key}: ${key === 'DB_PASSWORD' ? '***' : value}`);
    }
  }

  if (missingEnv.length > 0) {
    console.log('\n   ⚠️  Missing environment variables. Check .env.local\n');
    process.exit(1);
  }

  // 2. Try database connection
  console.log('\n2. Testing database connection...\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await connection.ping();
    console.log(`   ✅ Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}`);

  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    console.log('\n   Check your database credentials and ensure MySQL is running.\n');
    process.exit(1);
  }

  // 3. Check tables
  console.log('\n3. Checking required tables...\n');

  const [existingTables] = await connection.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [process.env.DB_NAME]
  );

  const tableNames = existingTables.map(t => t.TABLE_NAME || t.table_name);
  let missingTables = [];
  let tablesOK = 0;

  for (const tableName of Object.keys(REQUIRED_TABLES)) {
    if (tableNames.includes(tableName)) {
      // Get row count
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM ${tableName}`);
      console.log(`   ✅ ${tableName.padEnd(25)} (${count[0].cnt} rows)`);
      tablesOK++;
    } else {
      console.log(`   ❌ ${tableName.padEnd(25)} MISSING`);
      missingTables.push(tableName);
    }
  }

  console.log(`\n   ${tablesOK}/${Object.keys(REQUIRED_TABLES).length} tables exist`);

  // 4. Check columns for existing tables
  console.log('\n4. Checking table columns...\n');

  let columnsIssues = [];

  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLES)) {
    if (!tableNames.includes(tableName)) continue;

    const [columns] = await connection.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
      [process.env.DB_NAME, tableName]
    );

    const existingCols = columns.map(c => c.COLUMN_NAME || c.column_name);
    const missing = requiredColumns.filter(col => !existingCols.includes(col));

    if (missing.length > 0) {
      console.log(`   ⚠️  ${tableName}: Missing columns: ${missing.join(', ')}`);
      columnsIssues.push({ table: tableName, missing });
    } else {
      console.log(`   ✅ ${tableName}: All essential columns exist`);
    }
  }

  // 5. Check trips.status ENUM
  console.log('\n5. Checking trips.status ENUM...\n');

  try {
    const [enumResult] = await connection.query(`
      SELECT COLUMN_TYPE FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'trips' AND column_name = 'status'
    `, [process.env.DB_NAME]);

    if (enumResult.length > 0) {
      const enumStr = enumResult[0].COLUMN_TYPE;
      const match = enumStr.match(/enum\((.*)\)/i);

      if (match) {
        const currentStatuses = match[1].split(',').map(s => s.replace(/'/g, '').trim());
        const missing = EXPECTED_STATUSES.filter(s => !currentStatuses.includes(s));

        console.log(`   Current values: ${currentStatuses.length}`);

        if (missing.length > 0) {
          console.log(`   ⚠️  Missing statuses: ${missing.join(', ')}`);
          console.log(`   Run migration to add: pending_approval, pending_urgent, auto_approved, approved_solo, expired`);
        } else {
          console.log(`   ✅ All required status values present`);
        }
      }
    }
  } catch (err) {
    console.log(`   ⚠️  Could not check ENUM: ${err.message}`);
  }

  // 6. Data summary
  console.log('\n6. Data Summary...\n');

  const summaryTables = ['users', 'trips', 'optimization_groups', 'join_requests'];
  for (const table of summaryTables) {
    if (tableNames.includes(table)) {
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`   ${table.padEnd(25)}: ${count[0].cnt} records`);
    }
  }

  // 7. Final summary
  console.log('\n========================================');
  console.log('   VERIFICATION SUMMARY');
  console.log('========================================\n');

  if (missingTables.length === 0 && columnsIssues.length === 0) {
    console.log('   ✅ Database is properly configured!\n');
    console.log('   All required tables and columns exist.');
    console.log('   The application should work correctly.\n');
  } else {
    console.log('   ⚠️  Issues found:\n');

    if (missingTables.length > 0) {
      console.log(`   Missing tables: ${missingTables.join(', ')}`);
      console.log(`   → Run: mysql -u ${process.env.DB_USER} -p ${process.env.DB_NAME} < sql/000_COMPLETE_DATABASE_SETUP.sql\n`);
    }

    if (columnsIssues.length > 0) {
      console.log('   Tables with missing columns:');
      columnsIssues.forEach(issue => {
        console.log(`   - ${issue.table}: ${issue.missing.join(', ')}`);
      });
      console.log(`   → Run database migrations in /sql folder\n`);
    }
  }

  // Close connection
  await connection.end();
  console.log('========================================\n');
}

main().catch(console.error);
