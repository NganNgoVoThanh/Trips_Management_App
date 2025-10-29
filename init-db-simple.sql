-- init-db-simple.sql
-- Simple database initialization without stored procedures
-- Database: tripsmgm-mydb002

USE `tripsmgm-mydb002`;

-- Drop existing tables if they exist
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS join_requests;
DROP TABLE IF EXISTS temp_trips;
DROP TABLE IF EXISTS optimization_groups;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 1. TRIPS TABLE
-- ============================================
CREATE TABLE trips (
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
  status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft') DEFAULT 'pending',
  vehicle_type VARCHAR(50),
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  optimized_group_id VARCHAR(255),
  original_departure_time TIME,
  notified BOOLEAN DEFAULT FALSE,
  data_type ENUM('raw', 'temp', 'final') DEFAULT 'raw',
  parent_trip_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_user_email (user_email),
  INDEX idx_status (status),
  INDEX idx_departure_date (departure_date),
  INDEX idx_optimized_group_id (optimized_group_id),
  INDEX idx_data_type (data_type),
  INDEX idx_parent_trip_id (parent_trip_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TEMP_TRIPS TABLE
-- ============================================
CREATE TABLE temp_trips (
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
  parent_trip_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_optimized_group_id (optimized_group_id),
  INDEX idx_parent_trip_id (parent_trip_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. OPTIMIZATION_GROUPS TABLE
-- ============================================
CREATE TABLE optimization_groups (
  id VARCHAR(255) PRIMARY KEY,
  trips JSON NOT NULL,
  proposed_departure_time TIME NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  estimated_savings DECIMAL(10, 2) NOT NULL,
  status ENUM('proposed', 'approved', 'rejected') DEFAULT 'proposed',
  created_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_approved_by (approved_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. JOIN_REQUESTS TABLE
-- ============================================
CREATE TABLE join_requests (
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
  INDEX idx_processed_by (processed_by),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_join_requests_trip
    FOREIGN KEY (trip_id)
    REFERENCES trips(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. USERS TABLE
-- ============================================
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'manager') DEFAULT 'user',
  department VARCHAR(255),
  employee_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_employee_id (employee_id),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. INSERT DEFAULT USERS
-- ============================================
INSERT INTO users (id, email, name, role, department, employee_id, is_active) VALUES
  ('admin-001', 'admin@intersnack.com.vn', 'System Administrator', 'admin', 'IT', 'ADM001', TRUE),
  ('admin-002', 'manager@intersnack.com.vn', 'Operations Manager', 'admin', 'Operations', 'MGR001', TRUE),
  ('admin-003', 'hr@intersnack.com.vn', 'HR Manager', 'manager', 'Human Resources', 'HR001', TRUE)
ON DUPLICATE KEY UPDATE
  updated_at = CURRENT_TIMESTAMP,
  is_active = TRUE;

-- ============================================
-- 7. VERIFICATION
-- ============================================
SELECT 'Database setup completed!' as Message;
SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'tripsmgm-mydb002' AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
