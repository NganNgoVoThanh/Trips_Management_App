#!/usr/bin/env node
/**
 * Run Database Migration Script
 * Run: node scripts/run-migration.js
 */

require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n========================================');
  console.log('   Running Database Migration');
  console.log('========================================\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log(`✅ Connected to ${process.env.DB_NAME}\n`);

    // Run migrations step by step
    console.log('1. Creating missing tables...\n');

    // 1. Create vehicles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL,
        cost_per_km DECIMAL(10, 2) NOT NULL,
        license_plate VARCHAR(50),
        status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ vehicles table');

    // 2. Create approval_audit_log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_audit_log (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_name VARCHAR(255),
        actor_role ENUM('user', 'manager', 'admin') DEFAULT 'user',
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_actor_email (actor_email),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ approval_audit_log table');

    // 3. Create admin_override_log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_override_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action_type ENUM('approve', 'reject') NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255),
        reason TEXT,
        original_status VARCHAR(50),
        new_status VARCHAR(50),
        override_reason VARCHAR(100) DEFAULT 'EXPIRED_APPROVAL_LINK',
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        manager_email VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_admin_email (admin_email),
        INDEX idx_created_at (created_at),
        INDEX idx_action_type (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ admin_override_log table');

    // 4. Create manager_confirmations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manager_confirmations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        pending_manager_email VARCHAR(255) NOT NULL,
        pending_manager_name VARCHAR(255),
        confirmation_token VARCHAR(255) NOT NULL UNIQUE,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_email (user_email),
        INDEX idx_confirmation_token (confirmation_token),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ manager_confirmations table');

    // 5. Create azure_ad_users_cache table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS azure_ad_users_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        azure_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        department VARCHAR(100) DEFAULT NULL,
        office_location VARCHAR(100) DEFAULT NULL,
        job_title VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_display_name (display_name),
        INDEX idx_department (department),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ azure_ad_users_cache table');

    // 2. Add missing columns to users table
    console.log('\n2. Adding missing columns to users table...\n');

    const userColumns = [
      { name: 'manager_email', sql: 'ALTER TABLE users ADD COLUMN manager_email VARCHAR(255) DEFAULT NULL' },
      { name: 'manager_name', sql: 'ALTER TABLE users ADD COLUMN manager_name VARCHAR(255) DEFAULT NULL' },
      { name: 'profile_completed', sql: 'ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE' },
      { name: 'status', sql: 'ALTER TABLE users ADD COLUMN status ENUM("active", "inactive", "disabled") DEFAULT "active"' },
      { name: 'manager_confirmed', sql: 'ALTER TABLE users ADD COLUMN manager_confirmed BOOLEAN DEFAULT FALSE' },
      { name: 'admin_type', sql: 'ALTER TABLE users ADD COLUMN admin_type ENUM("admin", "super_admin") DEFAULT "admin"' },
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

    // 3. Add missing columns to trips table
    console.log('\n3. Adding missing columns to trips table...\n');

    const tripColumns = [
      { name: 'manager_approval_status', sql: 'ALTER TABLE trips ADD COLUMN manager_approval_status ENUM("pending", "approved", "rejected", "expired") DEFAULT NULL' },
      { name: 'manager_approval_token', sql: 'ALTER TABLE trips ADD COLUMN manager_approval_token VARCHAR(500) DEFAULT NULL' },
      { name: 'manager_approval_at', sql: 'ALTER TABLE trips ADD COLUMN manager_approval_at TIMESTAMP NULL' },
      { name: 'manager_approved_by', sql: 'ALTER TABLE trips ADD COLUMN manager_approved_by VARCHAR(255) DEFAULT NULL' },
      { name: 'purpose', sql: 'ALTER TABLE trips ADD COLUMN purpose TEXT DEFAULT NULL' },
      { name: 'cc_emails', sql: 'ALTER TABLE trips ADD COLUMN cc_emails JSON DEFAULT NULL' },
      { name: 'is_urgent', sql: 'ALTER TABLE trips ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE' },
      { name: 'auto_approved', sql: 'ALTER TABLE trips ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE' },
      { name: 'expired_notification_sent', sql: 'ALTER TABLE trips ADD COLUMN expired_notification_sent BOOLEAN DEFAULT FALSE' },
      { name: 'expired_notified_at', sql: 'ALTER TABLE trips ADD COLUMN expired_notified_at TIMESTAMP NULL' },
      { name: 'created_by_admin', sql: 'ALTER TABLE trips ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE' },
      { name: 'admin_email', sql: 'ALTER TABLE trips ADD COLUMN admin_email VARCHAR(255) DEFAULT NULL' },
      { name: 'notes', sql: 'ALTER TABLE trips ADD COLUMN notes TEXT DEFAULT NULL' },
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

    // 4. Update trips status ENUM
    console.log('\n4. Updating trips.status ENUM...\n');

    try {
      await connection.query(`
        ALTER TABLE trips
        MODIFY COLUMN status ENUM(
          'pending_approval',
          'pending_urgent',
          'auto_approved',
          'approved',
          'approved_solo',
          'optimized',
          'rejected',
          'cancelled',
          'expired',
          'pending',
          'confirmed',
          'draft'
        ) DEFAULT 'pending_approval'
      `);
      console.log('   ✅ trips.status ENUM updated');
    } catch (err) {
      console.log(`   ⚠️  trips.status: ${err.message}`);
    }

    // 5. Add indexes
    console.log('\n5. Adding indexes...\n');

    const indexes = [
      { table: 'trips', name: 'idx_manager_approval_status', sql: 'ALTER TABLE trips ADD INDEX idx_manager_approval_status (manager_approval_status)' },
      { table: 'trips', name: 'idx_is_urgent', sql: 'ALTER TABLE trips ADD INDEX idx_is_urgent (is_urgent)' },
      { table: 'users', name: 'idx_manager_email', sql: 'ALTER TABLE users ADD INDEX idx_manager_email (manager_email)' },
    ];

    for (const idx of indexes) {
      try {
        await connection.query(idx.sql);
        console.log(`   ✅ Added: ${idx.table}.${idx.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`   ⏭️  Exists: ${idx.table}.${idx.name}`);
        } else {
          console.log(`   ⚠️  ${idx.table}.${idx.name}: ${err.message}`);
        }
      }
    }

    // 6. Verification
    console.log('\n========================================');
    console.log('   MIGRATION COMPLETE');
    console.log('========================================\n');

    // Show tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Total tables: ${tables.length}`);
    tables.forEach(t => {
      const name = Object.values(t)[0];
      console.log(`   - ${name}`);
    });

    // Show counts
    console.log('\nRecord counts:');
    const countTables = ['users', 'trips', 'optimization_groups', 'join_requests', 'vehicles', 'approval_audit_log', 'admin_override_log'];
    for (const table of countTables) {
      try {
        const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        console.log(`   ${table.padEnd(25)}: ${count[0].cnt} rows`);
      } catch (err) {
        console.log(`   ${table.padEnd(25)}: error`);
      }
    }

    console.log('\n✅ All migrations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
