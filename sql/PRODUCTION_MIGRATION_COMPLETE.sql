-- ============================================
-- COMPLETE PRODUCTION MIGRATION
-- ============================================
-- This script includes ALL necessary changes for production:
-- 1. Add missing tables (locations, pending_admin_assignments, admin_audit_log, temp_trips)
-- 2. Add missing columns to users and vehicles tables
-- 3. Create stored procedures with correct data types
-- 4. Insert 4 app locations
-- 5. Add performance indexes
--
-- Run this on PRODUCTION server to fix profile setup error
-- ============================================

SELECT '========================================' AS '';
SELECT 'STARTING PRODUCTION MIGRATION' AS status;
SELECT DATABASE() as current_database;
SELECT NOW() as migration_time;
SELECT '========================================' AS '';

-- ============================================
-- PART 1: CREATE MISSING TABLES
-- ============================================

SELECT '=== PART 1: Creating missing tables ===' AS '';

-- Table: locations
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(255) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  province VARCHAR(100),
  address TEXT,
  type ENUM('factory', 'office', 'warehouse', 'branch') DEFAULT 'office',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Created/verified: locations' AS status;

-- Table: pending_admin_assignments
CREATE TABLE IF NOT EXISTS pending_admin_assignments (
  id VARCHAR(255) PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  requested_admin_type ENUM('admin', 'super_admin', 'location_admin') NOT NULL,
  location_id VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_by_email VARCHAR(255) NOT NULL,
  requested_by_name VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by_email VARCHAR(255),
  rejection_reason TEXT,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Created/verified: pending_admin_assignments' AS status;

-- Table: admin_audit_log (with VARCHAR id for UUID)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id VARCHAR(255) PRIMARY KEY,
  action_type ENUM('GRANT_ADMIN', 'REVOKE_ADMIN', 'MODIFY_ADMIN') NOT NULL,
  target_user_email VARCHAR(255) NOT NULL,
  target_user_name VARCHAR(255),
  previous_admin_type VARCHAR(50),
  new_admin_type VARCHAR(50),
  previous_location_id VARCHAR(255),
  new_location_id VARCHAR(255),
  performed_by_email VARCHAR(255) NOT NULL,
  performed_by_name VARCHAR(255),
  reason TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target_user (target_user_email),
  INDEX idx_performed_by (performed_by_email),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Created/verified: admin_audit_log' AS status;

-- Table: temp_trips
CREATE TABLE IF NOT EXISTS temp_trips (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  departure_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  return_date DATE NOT NULL,
  return_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft') DEFAULT 'draft',
  vehicle_type VARCHAR(50),
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  optimized_group_id VARCHAR(255),
  original_departure_time TIME,
  notified BOOLEAN DEFAULT FALSE,
  data_type ENUM('raw', 'temp', 'final') DEFAULT 'temp',
  parent_trip_id VARCHAR(255) COMMENT 'Reference to original trip in trips table',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_optimized_group_id (optimized_group_id),
  INDEX idx_parent_trip_id (parent_trip_id),
  INDEX idx_status (status),
  INDEX idx_data_type (data_type),
  INDEX idx_optimized_group_status (optimized_group_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Created/verified: temp_trips' AS status;

-- ============================================
-- PART 2: ADD MISSING COLUMNS TO USERS TABLE
-- ============================================

SELECT '=== PART 2: Adding missing columns to users table ===' AS '';

-- Add admin_location_id
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'users'
  AND column_name = 'admin_location_id'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN admin_location_id VARCHAR(255) AFTER admin_type',
  'SELECT "admin_location_id already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add admin_assigned_at
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'users'
  AND column_name = 'admin_assigned_at'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN admin_assigned_at TIMESTAMP NULL AFTER admin_location_id',
  'SELECT "admin_assigned_at already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add admin_assigned_by
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'users'
  AND column_name = 'admin_assigned_by'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN admin_assigned_by VARCHAR(255) AFTER admin_assigned_at',
  'SELECT "admin_assigned_by already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update admin_type ENUM to include 'location_admin'
ALTER TABLE users MODIFY COLUMN admin_type ENUM('admin', 'super_admin', 'location_admin') DEFAULT 'admin';

SELECT 'Added/verified: admin columns in users table' AS status;

-- ============================================
-- PART 3: ADD MISSING COLUMNS TO VEHICLES TABLE
-- ============================================

SELECT '=== PART 3: Adding missing columns to vehicles table ===' AS '';

-- Add vehicle_number
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'vehicles'
  AND column_name = 'vehicle_number'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN vehicle_number VARCHAR(50) AFTER id',
  'SELECT "vehicle_number already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add vehicle_type
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'vehicles'
  AND column_name = 'vehicle_type'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN vehicle_type VARCHAR(50) AFTER vehicle_number',
  'SELECT "vehicle_type already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add driver_name
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'vehicles'
  AND column_name = 'driver_name'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN driver_name VARCHAR(255) AFTER vehicle_type',
  'SELECT "driver_name already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add driver_phone
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'vehicles'
  AND column_name = 'driver_phone'
);

SET @query = IF(@col_exists = 0,
  'ALTER TABLE vehicles ADD COLUMN driver_phone VARCHAR(20) AFTER driver_name',
  'SELECT "driver_phone already exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Added/verified: vehicle columns' AS status;

-- ============================================
-- PART 4: CREATE STORED PROCEDURES
-- ============================================

SELECT '=== PART 4: Creating stored procedures ===' AS '';

DROP PROCEDURE IF EXISTS sp_grant_admin_role;
DROP PROCEDURE IF EXISTS sp_revoke_admin_role;

DELIMITER $$

CREATE PROCEDURE sp_grant_admin_role(
    IN p_user_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_admin_type VARCHAR(50) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_location_id VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_performed_by_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_performed_by_name VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_reason TEXT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ip_address VARCHAR(50) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_user_id VARCHAR(255);
    DECLARE v_user_name VARCHAR(255);
    DECLARE v_previous_admin_type VARCHAR(50);
    DECLARE v_previous_location_id VARCHAR(255);

    SELECT id, name, admin_type, admin_location_id
    INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
    FROM users
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    UPDATE users
    SET role = 'admin',
        admin_type = p_admin_type,
        admin_location_id = p_location_id,
        admin_assigned_at = NOW(),
        admin_assigned_by = p_performed_by_email,
        updated_at = NOW()
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

    INSERT INTO admin_audit_log (
        id, action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, performed_by_name,
        reason, ip_address
    ) VALUES (
        UUID(), 'GRANT_ADMIN', p_user_email, v_user_name,
        v_previous_admin_type, p_admin_type,
        v_previous_location_id, p_location_id,
        p_performed_by_email, p_performed_by_name,
        p_reason, p_ip_address
    );
END$$

CREATE PROCEDURE sp_revoke_admin_role(
    IN p_user_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_performed_by_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_reason TEXT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ip_address VARCHAR(50) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_user_agent TEXT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_user_id VARCHAR(255);
    DECLARE v_user_name VARCHAR(255);
    DECLARE v_previous_admin_type VARCHAR(50);
    DECLARE v_previous_location_id VARCHAR(255);

    SELECT id, name, admin_type, admin_location_id
    INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
    FROM users
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    UPDATE users
    SET role = 'user',
        admin_type = 'admin',
        admin_location_id = NULL,
        admin_assigned_at = NULL,
        admin_assigned_by = NULL,
        updated_at = NOW()
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

    INSERT INTO admin_audit_log (
        id, action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, reason, ip_address, user_agent
    ) VALUES (
        UUID(), 'REVOKE_ADMIN', p_user_email, v_user_name,
        v_previous_admin_type, 'none',
        v_previous_location_id, NULL,
        p_performed_by_email, p_reason, p_ip_address, p_user_agent
    );
END$$

DELIMITER ;

SELECT 'Created: stored procedures' AS status;

-- ============================================
-- PART 5: INSERT 4 APP LOCATIONS
-- ============================================

SELECT '=== PART 5: Inserting app locations ===' AS '';

INSERT INTO locations (id, code, name, province, address, type, status) VALUES
('hcm-office', 'HCM', 'Ho Chi Minh Office', 'Ho Chi Minh City',
 '76 Le Lai Street, Ben Thanh Ward, District 1, Ho Chi Minh City, Vietnam',
 'office', 'active')
ON DUPLICATE KEY UPDATE
  code = 'HCM',
  name = 'Ho Chi Minh Office',
  province = 'Ho Chi Minh City',
  type = 'office',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO locations (id, code, name, province, address, type, status) VALUES
('phan-thiet-factory', 'PT', 'Phan Thiet Factory', 'Binh Thuan',
 'Lot 1/9+11+13 & Lot 1/6 Phan Thiet Industrial Zone Phase 1, Phong Nam Commune, Phan Thiet City, Binh Thuan Province, Vietnam',
 'factory', 'active')
ON DUPLICATE KEY UPDATE
  code = 'PT',
  name = 'Phan Thiet Factory',
  province = 'Binh Thuan',
  type = 'factory',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO locations (id, code, name, province, address, type, status) VALUES
('long-an-factory', 'LA', 'Long An Factory', 'Long An',
 'Lot H.2 along Road No. 6 in Loi Binh Nhon Industrial Cluster, Loi Binh Nhon Commune, Tan An City, Long An Province, Vietnam',
 'factory', 'active')
ON DUPLICATE KEY UPDATE
  code = 'LA',
  name = 'Long An Factory',
  province = 'Long An',
  type = 'factory',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO locations (id, code, name, province, address, type, status) VALUES
('tay-ninh-factory', 'TN', 'Tay Ninh Factory', 'Tay Ninh',
 'Kinh Te Hamlet, Binh Minh Commune, Tay Ninh City, Tay Ninh Province, Vietnam',
 'factory', 'active')
ON DUPLICATE KEY UPDATE
  code = 'TN',
  name = 'Tay Ninh Factory',
  province = 'Tay Ninh',
  type = 'factory',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

SELECT 'Inserted: 4 app locations' AS status;

-- ============================================
-- PART 6: ADD PERFORMANCE INDEXES
-- ============================================

SELECT '=== PART 6: Adding performance indexes ===' AS '';

-- TRIPS TABLE INDEXES
SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
  AND table_name = 'trips'
  AND index_name = 'idx_status_departure_date'
);

SET @query = IF(@index_exists = 0,
  'ALTER TABLE trips ADD INDEX idx_status_departure_date (status, departure_date)',
  'SELECT "idx_status_departure_date exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
  AND table_name = 'trips'
  AND index_name = 'idx_user_email_status'
);

SET @query = IF(@index_exists = 0,
  'ALTER TABLE trips ADD INDEX idx_user_email_status (user_email, status)',
  'SELECT "idx_user_email_status exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- JOIN_REQUESTS INDEXES
SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
  AND table_name = 'join_requests'
  AND index_name = 'idx_requester_status'
);

SET @query = IF(@index_exists = 0,
  'ALTER TABLE join_requests ADD INDEX idx_requester_status (requester_id, status)',
  'SELECT "idx_requester_status exists" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Added: performance indexes' AS status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT '========================================' AS '';
SELECT 'MIGRATION VERIFICATION' AS '';
SELECT '========================================' AS '';

-- Users table admin columns
SELECT 'Users admin columns:' as check_item,
  CONCAT(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
     AND table_name = 'users'
     AND column_name IN ('admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
    ), '/4'
  ) as result;

-- New tables
SELECT 'New tables:' as check_item,
  CONCAT(
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = DATABASE()
     AND table_name IN ('locations', 'temp_trips', 'pending_admin_assignments', 'admin_audit_log')
    ), '/4'
  ) as result;

-- Stored procedures
SELECT 'Stored procedures:' as check_item,
  CONCAT(
    (SELECT COUNT(*) FROM information_schema.ROUTINES
     WHERE ROUTINE_SCHEMA = DATABASE()
     AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
    ), '/2'
  ) as result;

-- Locations
SELECT 'App locations:' as check_item,
  CONCAT(
    (SELECT COUNT(*) FROM locations
     WHERE id IN ('hcm-office', 'phan-thiet-factory', 'long-an-factory', 'tay-ninh-factory')
     AND status = 'active'
    ), '/4'
  ) as result;

SELECT '========================================' AS '';
SELECT '✅ PRODUCTION MIGRATION COMPLETED' AS final_status;
SELECT '========================================' AS '';
