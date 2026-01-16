#!/usr/bin/env node
/**
 * Create missing database objects - Simplified version
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   Creating Missing Database Objects');
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

    // 1. Create locations table
    console.log('1. Creating locations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        address TEXT,
        province VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_active (active),
        INDEX idx_province (province)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ locations table created\n');

    // Insert default locations
    console.log('2. Inserting default locations...');
    await connection.query(`
      INSERT IGNORE INTO locations (id, name, code, address, province, active) VALUES
      ('LOC-HCM-001', 'Ho Chi Minh Office', 'HCM', '123 Nguyen Hue, District 1', 'Ho Chi Minh City', TRUE),
      ('LOC-HAN-001', 'Hanoi Office', 'HAN', '456 Ba Dinh Square', 'Hanoi', TRUE),
      ('LOC-DNA-001', 'Da Nang Office', 'DNA', '789 Bach Dang Street', 'Da Nang', TRUE),
      ('LOC-VT-001', 'Vung Tau Factory', 'VT', 'Industrial Zone A', 'Ba Ria - Vung Tau', TRUE),
      ('LOC-BD-001', 'Binh Duong Factory', 'BD', 'Vietnam Singapore Industrial Park', 'Binh Duong', TRUE)
    `);
    console.log('✅ Default locations added\n');

    // 2. Create admin_audit_log table
    console.log('3. Creating admin_audit_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type ENUM('grant_admin', 'revoke_admin', 'update_admin', 'change_location') NOT NULL,
        target_user_email VARCHAR(255) NOT NULL,
        target_user_name VARCHAR(255),
        previous_admin_type ENUM('admin', 'super_admin', 'location_admin'),
        new_admin_type ENUM('admin', 'super_admin', 'location_admin'),
        previous_location_id VARCHAR(255),
        new_location_id VARCHAR(255),
        performed_by_email VARCHAR(255) NOT NULL,
        performed_by_name VARCHAR(255),
        reason TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_target_user (target_user_email),
        INDEX idx_performed_by (performed_by_email),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ admin_audit_log table created\n');

    // 3. Add columns to users table
    console.log('4. Adding columns to users table...');

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN admin_location_id VARCHAR(255) AFTER admin_type
      `);
      console.log('✅ Added admin_location_id');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  admin_location_id already exists');
      } else throw e;
    }

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN admin_assigned_at TIMESTAMP NULL AFTER admin_location_id
      `);
      console.log('✅ Added admin_assigned_at');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  admin_assigned_at already exists');
      } else throw e;
    }

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN admin_assigned_by VARCHAR(255) AFTER admin_assigned_at
      `);
      console.log('✅ Added admin_assigned_by');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  admin_assigned_by already exists');
      } else throw e;
    }

    try {
      await connection.query(`
        CREATE INDEX idx_admin_location ON users(admin_location_id)
      `);
      console.log('✅ Created index idx_admin_location\n');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  idx_admin_location already exists\n');
      } else throw e;
    }

    // 4. Create view
    console.log('5. Creating v_active_admins view...');
    await connection.query(`DROP VIEW IF EXISTS v_active_admins`);
    await connection.query(`
      CREATE VIEW v_active_admins AS
      SELECT
        u.id,
        u.email,
        u.name,
        u.employee_id,
        u.admin_type,
        u.admin_location_id,
        u.admin_assigned_at,
        u.admin_assigned_by,
        u.role,
        u.department,
        u.job_title,
        u.office_location,
        u.phone,
        u.profile_completed,
        u.created_at,
        u.updated_at,
        l.name AS location_name,
        l.code AS location_code,
        l.province AS location_province
      FROM users u
      LEFT JOIN locations l ON u.admin_location_id = l.id
      WHERE u.role = 'admin'
        AND u.admin_type IS NOT NULL
      ORDER BY u.admin_type, u.name
    `);
    console.log('✅ v_active_admins view created\n');

    // 5. Create stored procedures
    console.log('6. Creating sp_grant_admin_role procedure...');
    await connection.query(`DROP PROCEDURE IF EXISTS sp_grant_admin_role`);
    await connection.query(`
      CREATE PROCEDURE sp_grant_admin_role(
        IN p_user_email VARCHAR(255),
        IN p_admin_type VARCHAR(50),
        IN p_location_id VARCHAR(255),
        IN p_performed_by_email VARCHAR(255),
        IN p_performed_by_name VARCHAR(255),
        IN p_reason TEXT,
        IN p_ip_address VARCHAR(45)
      )
      BEGIN
        DECLARE v_user_name VARCHAR(255);
        DECLARE v_previous_admin_type VARCHAR(50);
        DECLARE v_previous_location_id VARCHAR(255);
        DECLARE v_user_exists INT;

        START TRANSACTION;

        SELECT COUNT(*), name, admin_type, admin_location_id
        INTO v_user_exists, v_user_name, v_previous_admin_type, v_previous_location_id
        FROM users
        WHERE email = p_user_email
        LIMIT 1;

        IF v_user_exists = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'User not found';
        END IF;

        UPDATE users
        SET
          role = 'admin',
          admin_type = p_admin_type,
          admin_location_id = p_location_id,
          admin_assigned_at = CURRENT_TIMESTAMP,
          admin_assigned_by = p_performed_by_email,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = p_user_email;

        INSERT INTO admin_audit_log (
          action_type, target_user_email, target_user_name,
          previous_admin_type, new_admin_type,
          previous_location_id, new_location_id,
          performed_by_email, performed_by_name,
          reason, ip_address
        ) VALUES (
          'grant_admin', p_user_email, v_user_name,
          v_previous_admin_type, p_admin_type,
          v_previous_location_id, p_location_id,
          p_performed_by_email, p_performed_by_name,
          p_reason, p_ip_address
        );

        COMMIT;
      END
    `);
    console.log('✅ sp_grant_admin_role created\n');

    console.log('7. Creating sp_revoke_admin_role procedure...');
    await connection.query(`DROP PROCEDURE IF EXISTS sp_revoke_admin_role`);
    await connection.query(`
      CREATE PROCEDURE sp_revoke_admin_role(
        IN p_user_email VARCHAR(255),
        IN p_performed_by_email VARCHAR(255),
        IN p_performed_by_name VARCHAR(255),
        IN p_reason TEXT,
        IN p_ip_address VARCHAR(45)
      )
      BEGIN
        DECLARE v_user_name VARCHAR(255);
        DECLARE v_previous_admin_type VARCHAR(50);
        DECLARE v_previous_location_id VARCHAR(255);
        DECLARE v_user_exists INT;

        START TRANSACTION;

        SELECT COUNT(*), name, admin_type, admin_location_id
        INTO v_user_exists, v_user_name, v_previous_admin_type, v_previous_location_id
        FROM users
        WHERE email = p_user_email
        LIMIT 1;

        IF v_user_exists = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'User not found';
        END IF;

        IF v_previous_admin_type IS NULL THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'User does not have admin role';
        END IF;

        UPDATE users
        SET
          role = 'user',
          admin_type = NULL,
          admin_location_id = NULL,
          admin_assigned_at = NULL,
          admin_assigned_by = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = p_user_email;

        INSERT INTO admin_audit_log (
          action_type, target_user_email, target_user_name,
          previous_admin_type, new_admin_type,
          previous_location_id, new_location_id,
          performed_by_email, performed_by_name,
          reason, ip_address
        ) VALUES (
          'revoke_admin', p_user_email, v_user_name,
          v_previous_admin_type, NULL,
          v_previous_location_id, NULL,
          p_performed_by_email, p_performed_by_name,
          p_reason, p_ip_address
        );

        COMMIT;
      END
    `);
    console.log('✅ sp_revoke_admin_role created\n');

    // Verification
    console.log('========================================');
    console.log('   VERIFICATION');
    console.log('========================================\n');

    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('locations', 'admin_audit_log')
      ORDER BY TABLE_NAME
    `);

    console.log('📋 Tables:');
    tables.forEach(t => {
      console.log(`   ✅ ${t.TABLE_NAME} (${t.TABLE_ROWS} rows)`);
    });

    const [views] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'v_active_admins'
        AND TABLE_TYPE = 'VIEW'
    `);

    console.log('\n👁️  Views:');
    views.forEach(v => {
      console.log(`   ✅ ${v.TABLE_NAME}`);
    });

    const [procs] = await connection.query(`
      SELECT ROUTINE_NAME
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
      ORDER BY ROUTINE_NAME
    `);

    console.log('\n⚙️  Stored Procedures:');
    procs.forEach(p => {
      console.log(`   ✅ ${p.ROUTINE_NAME}`);
    });

    const [cols] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n➕ New columns in users:');
    cols.forEach(c => {
      console.log(`   ✅ ${c.COLUMN_NAME} (${c.COLUMN_TYPE})`);
    });

    console.log('\n✅ All database objects created successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
