#!/usr/bin/env node
/**
 * Fix Remaining Missing Columns
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   Fixing Remaining Missing Columns');
  console.log('========================================\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`✅ Connected to ${process.env.DB_NAME}\n`);

    // Fix USERS table
    console.log('1. Fixing USERS table...\n');

    const userColumns = [
      { name: 'azure_id', sql: 'ALTER TABLE users ADD COLUMN azure_id VARCHAR(255) DEFAULT NULL' },
      { name: 'office_location', sql: 'ALTER TABLE users ADD COLUMN office_location VARCHAR(100) DEFAULT NULL' },
      { name: 'job_title', sql: 'ALTER TABLE users ADD COLUMN job_title VARCHAR(100) DEFAULT NULL' },
      { name: 'manager_azure_id', sql: 'ALTER TABLE users ADD COLUMN manager_azure_id VARCHAR(255) DEFAULT NULL' },
      { name: 'manager_confirmed_at', sql: 'ALTER TABLE users ADD COLUMN manager_confirmed_at TIMESTAMP NULL' },
      { name: 'pending_manager_email', sql: 'ALTER TABLE users ADD COLUMN pending_manager_email VARCHAR(255) DEFAULT NULL' },
      { name: 'manager_change_requested_at', sql: 'ALTER TABLE users ADD COLUMN manager_change_requested_at TIMESTAMP NULL' },
      { name: 'pickup_address', sql: 'ALTER TABLE users ADD COLUMN pickup_address TEXT DEFAULT NULL' },
      { name: 'pickup_notes', sql: 'ALTER TABLE users ADD COLUMN pickup_notes TEXT DEFAULT NULL' },
      { name: 'last_login_at', sql: 'ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL' },
    ];

    for (const col of userColumns) {
      try {
        await connection.query(col.sql);
        console.log(`   ✅ Added: users.${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⏭️  Exists: users.${col.name}`);
        } else {
          console.log(`   ❌ Error: users.${col.name} - ${err.message}`);
        }
      }
    }

    // Fix TRIPS table
    console.log('\n2. Fixing TRIPS table...\n');

    const tripColumns = [
      { name: 'auto_approved_reason', sql: 'ALTER TABLE trips ADD COLUMN auto_approved_reason VARCHAR(255) DEFAULT NULL' },
      { name: 'manager_email', sql: 'ALTER TABLE trips ADD COLUMN manager_email VARCHAR(255) DEFAULT NULL' },
      { name: 'manager_approval_token_expires', sql: 'ALTER TABLE trips ADD COLUMN manager_approval_token_expires DATETIME DEFAULT NULL' },
      { name: 'manager_rejection_reason', sql: 'ALTER TABLE trips ADD COLUMN manager_rejection_reason TEXT DEFAULT NULL' },
      { name: 'assigned_vehicle_id', sql: 'ALTER TABLE trips ADD COLUMN assigned_vehicle_id VARCHAR(255) DEFAULT NULL' },
      { name: 'vehicle_assignment_notes', sql: 'ALTER TABLE trips ADD COLUMN vehicle_assignment_notes TEXT DEFAULT NULL' },
      { name: 'vehicle_assigned_by', sql: 'ALTER TABLE trips ADD COLUMN vehicle_assigned_by VARCHAR(255) DEFAULT NULL' },
      { name: 'vehicle_assigned_at', sql: 'ALTER TABLE trips ADD COLUMN vehicle_assigned_at TIMESTAMP NULL' },
    ];

    for (const col of tripColumns) {
      try {
        await connection.query(col.sql);
        console.log(`   ✅ Added: trips.${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⏭️  Exists: trips.${col.name}`);
        } else {
          console.log(`   ❌ Error: trips.${col.name} - ${err.message}`);
        }
      }
    }

    console.log('\n✅ All columns fixed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
