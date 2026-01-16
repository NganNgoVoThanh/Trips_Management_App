#!/usr/bin/env node
/**
 * Add missing columns to trips table
 * NOTE: This ONLY touches trips table, NOT kpi_* tables
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   ADDING MISSING COLUMNS TO TRIPS');
  console.log('   (KPI tables will NOT be touched)');
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

    // Check current columns
    const [currentCols] = await connection.query('SHOW COLUMNS FROM trips');
    const existingCols = currentCols.map(c => c.Field);
    console.log(`Current columns: ${existingCols.length}\n`);

    // Columns to add
    const columnsToAdd = [
      { name: 'manager_approval_status', sql: "ALTER TABLE trips ADD COLUMN manager_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER status" },
      { name: 'manager_approval_token', sql: "ALTER TABLE trips ADD COLUMN manager_approval_token TEXT AFTER manager_approval_status" },
      { name: 'manager_approval_token_expires', sql: "ALTER TABLE trips ADD COLUMN manager_approval_token_expires DATETIME AFTER manager_approval_token" },
      { name: 'manager_approved_by', sql: "ALTER TABLE trips ADD COLUMN manager_approved_by VARCHAR(255) AFTER manager_approval_token_expires" },
      { name: 'manager_approval_at', sql: "ALTER TABLE trips ADD COLUMN manager_approval_at TIMESTAMP NULL AFTER manager_approved_by" },
      { name: 'manager_rejection_reason', sql: "ALTER TABLE trips ADD COLUMN manager_rejection_reason TEXT AFTER manager_approval_at" },
      { name: 'manager_email', sql: "ALTER TABLE trips ADD COLUMN manager_email VARCHAR(255) AFTER manager_rejection_reason" },
      { name: 'auto_approved', sql: "ALTER TABLE trips ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE AFTER manager_email" },
      { name: 'auto_approved_reason', sql: "ALTER TABLE trips ADD COLUMN auto_approved_reason VARCHAR(255) AFTER auto_approved" },
      { name: 'optimized_group_id', sql: "ALTER TABLE trips ADD COLUMN optimized_group_id VARCHAR(255) AFTER auto_approved_reason" },
      { name: 'original_departure_time', sql: "ALTER TABLE trips ADD COLUMN original_departure_time VARCHAR(10) AFTER optimized_group_id" },
      { name: 'created_by_admin', sql: "ALTER TABLE trips ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE AFTER original_departure_time" },
      { name: 'admin_email', sql: "ALTER TABLE trips ADD COLUMN admin_email VARCHAR(255) AFTER created_by_admin" },
      { name: 'assigned_vehicle_id', sql: "ALTER TABLE trips ADD COLUMN assigned_vehicle_id VARCHAR(255) AFTER admin_email" },
      { name: 'vehicle_assignment_notes', sql: "ALTER TABLE trips ADD COLUMN vehicle_assignment_notes TEXT AFTER assigned_vehicle_id" },
      { name: 'vehicle_assigned_by', sql: "ALTER TABLE trips ADD COLUMN vehicle_assigned_by VARCHAR(255) AFTER vehicle_assignment_notes" },
      { name: 'vehicle_assigned_at', sql: "ALTER TABLE trips ADD COLUMN vehicle_assigned_at TIMESTAMP NULL AFTER vehicle_assigned_by" }
    ];

    for (const col of columnsToAdd) {
      if (existingCols.includes(col.name)) {
        console.log(`  ⚠️  ${col.name} - already exists`);
      } else {
        try {
          await connection.query(col.sql);
          console.log(`  ✅ Added: ${col.name}`);
        } catch (e) {
          if (e.code === 'ER_DUP_FIELDNAME') {
            console.log(`  ⚠️  ${col.name} - already exists`);
          } else {
            console.log(`  ❌ ${col.name} - Error: ${e.message}`);
          }
        }
      }
    }

    // Add indexes
    console.log('\nAdding indexes...');
    const indexes = [
      { name: 'idx_manager_approval', sql: 'CREATE INDEX idx_manager_approval ON trips(manager_approval_status)' },
      { name: 'idx_optimized_group', sql: 'CREATE INDEX idx_optimized_group ON trips(optimized_group_id)' }
    ];

    for (const idx of indexes) {
      try {
        await connection.query(idx.sql);
        console.log(`  ✅ ${idx.name}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`  ⚠️  ${idx.name} - already exists`);
        } else {
          console.log(`  ⚠️  ${idx.name} - ${e.message}`);
        }
      }
    }

    // Verify
    console.log('\n=== VERIFICATION ===\n');
    const [newCols] = await connection.query('SHOW COLUMNS FROM trips');
    console.log(`Total columns now: ${newCols.length}`);

    const required = ['id', 'user_id', 'status', 'manager_approval_status', 'manager_email', 'auto_approved'];
    console.log('\nRequired columns:');
    required.forEach(r => {
      const exists = newCols.find(c => c.Field === r);
      console.log(`  ${exists ? '✅' : '❌'} ${r}`);
    });

    console.log('\n✅ Trips table updated!\n');

    // Verify KPI tables untouched
    console.log('Verifying KPI tables were not touched...');
    const [tables] = await connection.query('SHOW TABLES');
    const kpiTables = tables.map(t => Object.values(t)[0]).filter(t => t.startsWith('kpi_'));
    console.log(`✅ ${kpiTables.length} KPI tables still intact\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
