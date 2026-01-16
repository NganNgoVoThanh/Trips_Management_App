#!/usr/bin/env node
/**
 * Create ALL Trips Management System tables from scratch
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   CREATING ALL TRIPS TABLES');
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

    // 1. USERS TABLE
    console.log('1. Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
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
    console.log('✅ users\n');

    // 2. TRIPS TABLE
    console.log('2. Creating trips table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS trips (
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
    console.log('✅ trips\n');

    // 3. TEMP_TRIPS TABLE
    console.log('3. Creating temp_trips table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS temp_trips (
        id VARCHAR(255) PRIMARY KEY,
        parent_trip_id VARCHAR(255),
        optimized_group_id VARCHAR(255),
        data_type ENUM('temp', 'final') DEFAULT 'temp',
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        departure_location VARCHAR(255),
        destination VARCHAR(255),
        departure_date DATE,
        departure_time VARCHAR(10),
        return_date DATE,
        return_time VARCHAR(10),
        purpose TEXT,
        vehicle_type VARCHAR(50),
        passenger_count INT DEFAULT 1,
        estimated_cost DECIMAL(10, 2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_parent_trip (parent_trip_id),
        INDEX idx_group (optimized_group_id),
        INDEX idx_data_type (data_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ temp_trips\n');

    // 4. OPTIMIZATION_GROUPS TABLE
    console.log('4. Creating optimization_groups table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS optimization_groups (
        id VARCHAR(255) PRIMARY KEY,
        trips JSON,
        status ENUM('proposed', 'approved', 'rejected') DEFAULT 'proposed',
        estimated_savings DECIMAL(10, 2),
        vehicle_type VARCHAR(50),
        proposed_departure_time VARCHAR(10),
        participant_count INT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ optimization_groups\n');

    // 5. JOIN_REQUESTS TABLE
    console.log('5. Creating join_requests table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS join_requests (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        requester_id VARCHAR(255) NOT NULL,
        requester_email VARCHAR(255) NOT NULL,
        requester_name VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approved_by VARCHAR(255),
        approved_at TIMESTAMP NULL,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_trip (trip_id),
        INDEX idx_requester (requester_email),
        INDEX idx_status (status),
        UNIQUE KEY unique_request (trip_id, requester_email, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ join_requests\n');

    // 6. VEHICLES TABLE
    console.log('6. Creating vehicles table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL,
        cost_per_km DECIMAL(10, 2),
        license_plate VARCHAR(50),
        status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ vehicles\n');

    // 7. MANAGER_CONFIRMATIONS TABLE
    console.log('7. Creating manager_confirmations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manager_confirmations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        pending_manager_email VARCHAR(255) NOT NULL,
        confirmation_token VARCHAR(255) NOT NULL UNIQUE,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmed_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_email),
        INDEX idx_token (confirmation_token),
        INDEX idx_confirmed (confirmed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ manager_confirmations\n');

    // 8. APPROVAL_AUDIT_LOG TABLE
    console.log('8. Creating approval_audit_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approval_audit_log (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_role ENUM('user', 'manager', 'admin') NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip (trip_id),
        INDEX idx_actor (actor_email),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ approval_audit_log\n');

    // 9. ADMIN_OVERRIDE_LOG TABLE
    console.log('9. Creating admin_override_log table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_override_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id VARCHAR(255) NOT NULL,
        action_type ENUM('approve', 'reject') NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255),
        reason TEXT NOT NULL,
        original_status VARCHAR(50),
        new_status VARCHAR(50),
        override_reason ENUM('EXPIRED_APPROVAL_LINK', 'MANAGER_UNAVAILABLE', 'URGENT_BUSINESS_NEED', 'SYSTEM_ERROR', 'OTHER') NOT NULL,
        force_override BOOLEAN DEFAULT FALSE,
        user_email VARCHAR(255),
        manager_email VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip (trip_id),
        INDEX idx_admin (admin_email),
        INDEX idx_action (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ admin_override_log\n');

    // 10. AZURE_AD_USERS_CACHE TABLE
    console.log('10. Creating azure_ad_users_cache table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS azure_ad_users_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        azure_id VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        given_name VARCHAR(255),
        surname VARCHAR(255),
        job_title VARCHAR(255),
        department VARCHAR(255),
        office_location VARCHAR(255),
        manager_azure_id VARCHAR(255),
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_azure_id (azure_id),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ azure_ad_users_cache\n');

    // 11. ALLOWED_EMAIL_DOMAINS TABLE
    console.log('11. Creating allowed_email_domains table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS allowed_email_domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domain VARCHAR(255) NOT NULL UNIQUE,
        description VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain (domain),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      INSERT IGNORE INTO allowed_email_domains (domain, description, active)
      VALUES ('intersnack.com.vn', 'Intersnack Vietnam official domain', TRUE)
    `);
    console.log('✅ allowed_email_domains (with default domain)\n');

    // 12. LOCATIONS TABLE
    console.log('12. Creating locations table...');
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
    await connection.query(`
      INSERT IGNORE INTO locations (id, name, code, address, province, active) VALUES
      ('LOC-HCM-001', 'Ho Chi Minh Office', 'HCM', '123 Nguyen Hue, District 1', 'Ho Chi Minh City', TRUE),
      ('LOC-HAN-001', 'Hanoi Office', 'HAN', '456 Ba Dinh Square', 'Hanoi', TRUE),
      ('LOC-DNA-001', 'Da Nang Office', 'DNA', '789 Bach Dang Street', 'Da Nang', TRUE),
      ('LOC-VT-001', 'Vung Tau Factory', 'VT', 'Industrial Zone A', 'Ba Ria - Vung Tau', TRUE),
      ('LOC-BD-001', 'Binh Duong Factory', 'BD', 'Vietnam Singapore Industrial Park', 'Binh Duong', TRUE)
    `);
    console.log('✅ locations (with 5 default locations)\n');

    // 13. ADMIN_AUDIT_LOG TABLE
    console.log('13. Creating admin_audit_log table...');
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
    console.log('✅ admin_audit_log\n');

    // CREATE VIEWS & STORED PROCEDURES
    console.log('14. Creating v_active_admins view...');
    await connection.query(`DROP VIEW IF EXISTS v_active_admins`);
    await connection.query(`
      CREATE VIEW v_active_admins AS
      SELECT
        u.id, u.email, u.name, u.employee_id, u.admin_type,
        u.admin_location_id, u.admin_assigned_at, u.admin_assigned_by,
        u.role, u.department, u.job_title, u.office_location, u.phone,
        u.profile_completed, u.created_at, u.updated_at,
        l.name AS location_name, l.code AS location_code, l.province AS location_province
      FROM users u
      LEFT JOIN locations l ON u.admin_location_id = l.id
      WHERE u.role = 'admin' AND u.admin_type IS NOT NULL
      ORDER BY u.admin_type, u.name
    `);
    console.log('✅ v_active_admins\n');

    console.log('15. Creating sp_grant_admin_role procedure...');
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
        FROM users WHERE email = p_user_email LIMIT 1;

        IF v_user_exists = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
        END IF;

        UPDATE users SET
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
          performed_by_email, performed_by_name, reason, ip_address
        ) VALUES (
          'grant_admin', p_user_email, v_user_name,
          v_previous_admin_type, p_admin_type,
          v_previous_location_id, p_location_id,
          p_performed_by_email, p_performed_by_name, p_reason, p_ip_address
        );

        COMMIT;
      END
    `);
    console.log('✅ sp_grant_admin_role\n');

    console.log('16. Creating sp_revoke_admin_role procedure...');
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
        FROM users WHERE email = p_user_email LIMIT 1;

        IF v_user_exists = 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
        END IF;

        IF v_previous_admin_type IS NULL THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not have admin role';
        END IF;

        UPDATE users SET
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
          performed_by_email, performed_by_name, reason, ip_address
        ) VALUES (
          'revoke_admin', p_user_email, v_user_name,
          v_previous_admin_type, NULL,
          v_previous_location_id, NULL,
          p_performed_by_email, p_performed_by_name, p_reason, p_ip_address
        );

        COMMIT;
      END
    `);
    console.log('✅ sp_revoke_admin_role\n');

    console.log('========================================');
    console.log('   ✅ ALL TABLES CREATED!');
    console.log('========================================\n');

    console.log('Summary: 13 tables + 1 view + 2 stored procedures\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
