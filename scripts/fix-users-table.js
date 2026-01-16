#!/usr/bin/env node
/**
 * Fix users table by dropping and recreating with correct schema
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   FIXING USERS TABLE');
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

    // Check current table
    console.log('Checking current users table...');
    const [cols] = await connection.query('SHOW COLUMNS FROM users');
    console.log(`Current columns: ${cols.length}`);
    cols.forEach(c => console.log(`  - ${c.Field}`));

    // Backup data if any
    const [rows] = await connection.query('SELECT * FROM users');
    console.log(`\nCurrent data: ${rows.length} rows`);

    if (rows.length > 0) {
      console.log('⚠️  WARNING: Table has data! Backing up...');
      const backup = JSON.stringify(rows, null, 2);
      const fs = require('fs');
      fs.writeFileSync('users_backup.json', backup);
      console.log('✅ Backup saved to users_backup.json\n');
    }

    // Drop and recreate
    console.log('Dropping old users table...');
    await connection.query('DROP TABLE IF EXISTS users');
    console.log('✅ Dropped\n');

    console.log('Creating new users table with correct schema...');
    await connection.query(`
      CREATE TABLE users (
        id VARCHAR(255) PRIMARY KEY,
        azure_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        employee_id VARCHAR(50),
        role ENUM('user', 'admin') DEFAULT 'user',
        admin_type ENUM('admin', 'super_admin', 'location_admin'),
        admin_location_id VARCHAR(255),
        admin_assigned_at TIMESTAMP NULL,
        admin_assigned_by VARCHAR(255),
        department VARCHAR(255),
        job_title VARCHAR(255),
        office_location VARCHAR(255),
        manager_azure_id VARCHAR(255),
        manager_email VARCHAR(255),
        manager_name VARCHAR(255),
        manager_confirmed BOOLEAN DEFAULT FALSE,
        manager_confirmed_at TIMESTAMP NULL,
        pending_manager_email VARCHAR(255),
        manager_change_requested_at TIMESTAMP NULL,
        phone VARCHAR(50),
        pickup_address TEXT,
        pickup_notes TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_azure_id (azure_id),
        INDEX idx_role (role),
        INDEX idx_admin_type (admin_type),
        INDEX idx_manager_email (manager_email),
        INDEX idx_admin_location (admin_location_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created\n');

    // Verify new structure
    const [newCols] = await connection.query('SHOW COLUMNS FROM users');
    console.log('New table columns:');
    newCols.forEach(c => console.log(`  ✅ ${c.Field} (${c.Type})`));

    console.log('\n✅ Users table fixed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
