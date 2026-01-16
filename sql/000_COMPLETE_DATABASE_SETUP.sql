-- ============================================
-- TRIPS MANAGEMENT SYSTEM - COMPLETE DATABASE SETUP
-- ============================================
-- Run this script to set up ALL required tables
-- Execute in order from top to bottom
--
-- Last updated: 2025-01-15
-- ============================================

-- ============================================
-- 1. AZURE AD USERS CACHE TABLE
-- ============================================
-- Cache all users from Azure AD for manager dropdown
CREATE TABLE IF NOT EXISTS azure_ad_users_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  azure_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Azure AD Object ID (oid)',
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
-- 2. USERS TABLE
-- ============================================
-- Users who have logged into the system
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  azure_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  admin_type ENUM('admin', 'super_admin') DEFAULT 'admin',
  status ENUM('active', 'inactive', 'disabled') DEFAULT 'active',
  department VARCHAR(100) DEFAULT NULL,
  office_location VARCHAR(100) DEFAULT NULL,
  job_title VARCHAR(100) DEFAULT NULL,
  manager_azure_id VARCHAR(255) DEFAULT NULL,
  manager_email VARCHAR(255) DEFAULT NULL,
  manager_name VARCHAR(255) DEFAULT NULL,
  manager_confirmed BOOLEAN DEFAULT FALSE,
  manager_confirmed_at TIMESTAMP NULL,
  pending_manager_email VARCHAR(255) DEFAULT NULL,
  manager_change_requested_at TIMESTAMP NULL,
  phone VARCHAR(50) DEFAULT NULL,
  pickup_address TEXT DEFAULT NULL,
  pickup_notes TEXT DEFAULT NULL,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_manager_email (manager_email),
  INDEX idx_department (department),
  INDEX idx_profile_completed (profile_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TRIPS TABLE (Main)
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
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

  -- Status with all possible values
  status ENUM(
    'pending_approval',
    'pending_urgent',
    'auto_approved',
    'approved',
    'approved_solo',
    'optimized',
    'rejected',
    'cancelled',
    'expired',
    'pending',    -- Legacy
    'confirmed',  -- Legacy
    'draft'       -- Legacy
  ) DEFAULT 'pending_approval',

  vehicle_type VARCHAR(50),
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  optimized_group_id VARCHAR(255),
  original_departure_time TIME,
  notified BOOLEAN DEFAULT FALSE,
  data_type ENUM('raw', 'temp', 'final') DEFAULT 'raw',
  parent_trip_id VARCHAR(255),

  -- Email approval workflow
  purpose TEXT DEFAULT NULL,
  cc_emails JSON DEFAULT NULL,
  is_urgent BOOLEAN DEFAULT FALSE,
  auto_approved BOOLEAN DEFAULT FALSE,
  auto_approved_reason VARCHAR(255) DEFAULT NULL,
  manager_email VARCHAR(255) DEFAULT NULL,
  manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT NULL,
  manager_approval_token VARCHAR(500) DEFAULT NULL,
  manager_approval_token_expires DATETIME DEFAULT NULL,
  manager_approval_at TIMESTAMP NULL,
  manager_approved_by VARCHAR(255) DEFAULT NULL,
  manager_rejection_reason TEXT DEFAULT NULL,

  -- Expired notification tracking
  expired_notification_sent BOOLEAN DEFAULT FALSE,
  expired_notified_at TIMESTAMP NULL,

  -- Admin creation tracking
  created_by_admin BOOLEAN DEFAULT FALSE,
  admin_email VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,

  -- Vehicle assignment
  assigned_vehicle_id VARCHAR(255) DEFAULT NULL,
  vehicle_assignment_notes TEXT DEFAULT NULL,
  vehicle_assigned_by VARCHAR(255) DEFAULT NULL,
  vehicle_assigned_at TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_user_email (user_email),
  INDEX idx_status (status),
  INDEX idx_departure_date (departure_date),
  INDEX idx_optimized_group_id (optimized_group_id),
  INDEX idx_data_type (data_type),
  INDEX idx_manager_approval_status (manager_approval_status),
  INDEX idx_is_urgent (is_urgent),
  INDEX idx_auto_approved (auto_approved),
  INDEX idx_created_by_admin (created_by_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. OPTIMIZATION GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_groups (
  id VARCHAR(255) PRIMARY KEY,
  trips JSON NOT NULL COMMENT 'Array of trip IDs',
  proposed_departure_time TIME NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  estimated_savings DECIMAL(10, 2) NOT NULL,
  status ENUM('proposed', 'approved', 'rejected') DEFAULT 'proposed',
  created_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. VEHICLES TABLE
-- ============================================
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

-- ============================================
-- 6. JOIN REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS join_requests (
  id VARCHAR(255) PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  trip_details JSON NOT NULL,
  requester_id VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_department VARCHAR(255),
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  admin_notes TEXT,
  processed_by VARCHAR(255),
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trip_id (trip_id),
  INDEX idx_requester_id (requester_id),
  INDEX idx_requester_email (requester_email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. MANAGER CONFIRMATIONS TABLE
-- ============================================
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

-- ============================================
-- 8. APPROVAL AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id VARCHAR(255) PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  actor_name VARCHAR(255),
  actor_role ENUM('user', 'manager', 'admin') NOT NULL,
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

-- ============================================
-- 9. ADMIN OVERRIDE LOG TABLE
-- ============================================
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
  INDEX idx_action_type (action_type),
  INDEX idx_override_reason (override_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. UNIQUE CONSTRAINTS (Prevent duplicates)
-- ============================================
-- Add unique constraint on join_requests to prevent duplicate requests
-- Only add if not exists
SET @constraint_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
  AND table_name = 'join_requests'
  AND constraint_name = 'unique_pending_request'
);

SET @query = IF(@constraint_exists = 0,
  'ALTER TABLE join_requests ADD CONSTRAINT unique_pending_request UNIQUE (trip_id, requester_email, status)',
  'SELECT "unique_pending_request constraint already exists"'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all tables
SELECT 'Checking database tables...' AS status;
SHOW TABLES;

-- Verify trips table structure
SELECT 'Verifying trips table columns...' AS status;
DESCRIBE trips;

-- Verify users table structure
SELECT 'Verifying users table columns...' AS status;
DESCRIBE users;

-- Count records in each table
SELECT 'Counting records...' AS status;
SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM trips) as trips_count,
  (SELECT COUNT(*) FROM optimization_groups) as optimization_groups_count,
  (SELECT COUNT(*) FROM join_requests) as join_requests_count,
  (SELECT COUNT(*) FROM approval_audit_log) as audit_log_count,
  (SELECT COUNT(*) FROM admin_override_log) as override_log_count;

SELECT 'Database setup completed successfully!' AS final_status;
