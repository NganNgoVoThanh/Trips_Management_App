-- ============================================
-- FIX ALL MISSING TABLES AND COLUMNS
-- ============================================
-- Run this script to fix all database issues
-- Last updated: 2025-01-15
-- ============================================

-- ============================================
-- 1. CREATE MISSING TABLES
-- ============================================

-- 1.1 vehicles table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 approval_audit_log table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 admin_override_log table
CREATE TABLE IF NOT EXISTS admin_override_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  action_type ENUM('approve', 'reject') NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  admin_name VARCHAR(255),
  reason TEXT NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 manager_confirmations table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 azure_ad_users_cache table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. ADD MISSING COLUMNS TO USERS TABLE
-- ============================================

-- Add manager_email if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'manager_email');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN manager_email VARCHAR(255) DEFAULT NULL',
  'SELECT "manager_email already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add manager_name if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'manager_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN manager_name VARCHAR(255) DEFAULT NULL',
  'SELECT "manager_name already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add profile_completed if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'profile_completed');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE',
  'SELECT "profile_completed already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add status if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN status ENUM("active", "inactive", "disabled") DEFAULT "active"',
  'SELECT "status already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add manager_confirmed if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'manager_confirmed');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN manager_confirmed BOOLEAN DEFAULT FALSE',
  'SELECT "manager_confirmed already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add admin_type if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'admin_type');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN admin_type ENUM("admin", "super_admin") DEFAULT "admin"',
  'SELECT "admin_type already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. ADD MISSING COLUMNS TO TRIPS TABLE
-- ============================================

-- Add manager_approval_status if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'manager_approval_status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN manager_approval_status ENUM("pending", "approved", "rejected", "expired") DEFAULT NULL',
  'SELECT "manager_approval_status already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add manager_approval_token if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'manager_approval_token');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN manager_approval_token VARCHAR(500) DEFAULT NULL',
  'SELECT "manager_approval_token already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add manager_approval_at if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'manager_approval_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN manager_approval_at TIMESTAMP NULL',
  'SELECT "manager_approval_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add manager_approved_by if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'manager_approved_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN manager_approved_by VARCHAR(255) DEFAULT NULL',
  'SELECT "manager_approved_by already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add purpose if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'purpose');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN purpose TEXT DEFAULT NULL',
  'SELECT "purpose already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add cc_emails if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'cc_emails');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN cc_emails JSON DEFAULT NULL',
  'SELECT "cc_emails already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add is_urgent if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'is_urgent');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE',
  'SELECT "is_urgent already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add auto_approved if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'auto_approved');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE',
  'SELECT "auto_approved already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add expired_notification_sent if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'expired_notification_sent');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN expired_notification_sent BOOLEAN DEFAULT FALSE',
  'SELECT "expired_notification_sent already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add expired_notified_at if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'expired_notified_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN expired_notified_at TIMESTAMP NULL',
  'SELECT "expired_notified_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add created_by_admin if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'created_by_admin');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE',
  'SELECT "created_by_admin already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add admin_email if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'admin_email');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN admin_email VARCHAR(255) DEFAULT NULL',
  'SELECT "admin_email already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add notes if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE trips ADD COLUMN notes TEXT DEFAULT NULL',
  'SELECT "notes already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 4. UPDATE TRIPS STATUS ENUM
-- ============================================
-- This will modify the status column to include all required values
-- WARNING: Backup data before running in production!

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
) DEFAULT 'pending_approval';

-- ============================================
-- 5. ADD INDEXES
-- ============================================

-- Add index on manager_approval_status if not exists
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND index_name = 'idx_manager_approval_status');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE trips ADD INDEX idx_manager_approval_status (manager_approval_status)',
  'SELECT "idx_manager_approval_status already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on is_urgent if not exists
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'trips' AND index_name = 'idx_is_urgent');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE trips ADD INDEX idx_is_urgent (is_urgent)',
  'SELECT "idx_is_urgent already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on manager_email in users if not exists
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_manager_email');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE users ADD INDEX idx_manager_email (manager_email)',
  'SELECT "idx_manager_email already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. VERIFICATION
-- ============================================

SELECT '=== VERIFICATION ===' as '';

-- Show all tables
SELECT 'Tables in database:' as '';
SHOW TABLES;

-- Count records
SELECT 'Record counts:' as '';
SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM trips) as trips_count,
  (SELECT COUNT(*) FROM optimization_groups) as opt_groups_count,
  (SELECT COUNT(*) FROM join_requests) as join_requests_count;

-- Show trips status ENUM
SELECT 'Trips status ENUM:' as '';
SELECT COLUMN_TYPE FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'trips' AND column_name = 'status';

SELECT '=== MIGRATION COMPLETE ===' as '';
