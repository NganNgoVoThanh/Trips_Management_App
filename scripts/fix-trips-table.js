#!/usr/bin/env node
/**
 * Fix trips table by dropping and recreating with correct schema
 * NOTE: This ONLY touches trips table, NOT kpi_* tables
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   FIXING TRIPS TABLE');
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

    // Backup data if any
    console.log('Checking current trips table...');
    const [rows] = await connection.query('SELECT * FROM trips');
    console.log(`Current data: ${rows.length} rows`);

    if (rows.length > 0) {
      console.log('⚠️  WARNING: Table has data! Backing up...');
      const backup = JSON.stringify(rows, null, 2);
      const fs = require('fs');
      fs.writeFileSync('trips_backup.json', backup);
      console.log('✅ Backup saved to trips_backup.json\n');
    }

    // Drop and recreate
    console.log('Dropping old trips table...');
    await connection.query('DROP TABLE IF EXISTS trips');
    console.log('✅ Dropped\n');

    console.log('Creating new trips table with correct schema...');
    await connection.query(`
      CREATE TABLE trips (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        departure_location VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        departure_date DATE NOT NULL,
        departure_time VARCHAR(10),
        return_date DATE NOT NULL,
        return_time VARCHAR(10),
        purpose TEXT,
        vehicle_type VARCHAR(50),
        passenger_count INT DEFAULT 1,
        estimated_cost DECIMAL(10, 2),
        status ENUM('pending_approval', 'pending_urgent', 'auto_approved', 'approved', 'approved_solo', 'optimized', 'rejected', 'cancelled', 'expired', 'pending', 'confirmed', 'draft') DEFAULT 'pending_approval',
        manager_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        manager_approval_token TEXT,
        manager_approval_token_expires DATETIME,
        manager_approved_by VARCHAR(255),
        manager_approval_at TIMESTAMP NULL,
        manager_rejection_reason TEXT,
        manager_email VARCHAR(255),
        auto_approved BOOLEAN DEFAULT FALSE,
        auto_approved_reason VARCHAR(255),
        optimized_group_id VARCHAR(255),
        original_departure_time VARCHAR(10),
        created_by_admin BOOLEAN DEFAULT FALSE,
        admin_email VARCHAR(255),
        assigned_vehicle_id VARCHAR(255),
        vehicle_assignment_notes TEXT,
        vehicle_assigned_by VARCHAR(255),
        vehicle_assigned_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_departure_date (departure_date),
        INDEX idx_manager_approval (manager_approval_status),
        INDEX idx_optimized_group (optimized_group_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created\n');

    // Verify new structure
    const [cols] = await connection.query('SHOW COLUMNS FROM trips');
    console.log(`New trips table: ${cols.length} columns`);

    // Check critical columns
    const critical = ['id', 'user_id', 'status', 'manager_approval_status', 'manager_email'];
    console.log('\nCritical columns:');
    critical.forEach(c => {
      const exists = cols.find(col => col.Field === c);
      if (exists) {
        console.log(`  ✅ ${c}`);
      } else {
        console.log(`  ❌ ${c} MISSING!`);
      }
    });

    console.log('\n✅ Trips table fixed!\n');

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
