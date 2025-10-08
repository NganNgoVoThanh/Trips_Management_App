-- init-db.sql
-- Initialize Trips Management System Database

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS trips_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE trips_management;

-- Create trips table
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
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create temp_trips table for optimization proposals
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
  parent_trip_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_optimized_group_id (optimized_group_id),
  INDEX idx_parent_trip_id (parent_trip_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create optimization_groups table
CREATE TABLE IF NOT EXISTS optimization_groups (
  id VARCHAR(255) PRIMARY KEY,
  trips JSON NOT NULL COMMENT 'Array of trip IDs in this optimization group',
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
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create join_requests table - REQUIRED for join trip functionality
CREATE TABLE IF NOT EXISTS join_requests (
  id VARCHAR(255) PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL COMMENT 'ID of the trip user wants to join',
  trip_details JSON NOT NULL COMMENT 'Snapshot of trip details at request time',
  requester_id VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_department VARCHAR(255),
  reason TEXT COMMENT 'User reason for joining',
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  admin_notes TEXT COMMENT 'Admin notes when processing request',
  processed_by VARCHAR(255) COMMENT 'Admin user ID who processed',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trip_id (trip_id),
  INDEX idx_requester_id (requester_id),
  INDEX idx_requester_email (requester_email),
  INDEX idx_status (status),
  INDEX idx_processed_by (processed_by),
  INDEX idx_created_at (created_at),
  INDEX idx_composite_status_trip (status, trip_id),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table (optional - for future authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  department VARCHAR(255),
  employee_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin users
INSERT INTO users (id, email, name, role, department, employee_id, created_at) VALUES
  ('admin-001', 'admin@intersnack.com.vn', 'System Admin', 'admin', 'Management', 'EMP001', NOW()),
  ('admin-002', 'manager@intersnack.com.vn', 'Manager', 'admin', 'Management', 'EMP002', NOW()),
  ('admin-003', 'operations@intersnack.com.vn', 'Operations Manager', 'admin', 'Operations', 'EMP003', NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Create views for reporting
CREATE OR REPLACE VIEW v_trip_summary AS
SELECT 
  DATE(departure_date) as trip_date,
  status,
  data_type,
  COUNT(*) as trip_count,
  SUM(estimated_cost) as total_estimated_cost,
  SUM(actual_cost) as total_actual_cost,
  COUNT(DISTINCT user_id) as unique_users
FROM trips
GROUP BY DATE(departure_date), status, data_type;

CREATE OR REPLACE VIEW v_optimization_summary AS
SELECT 
  og.id,
  og.status,
  og.vehicle_type,
  og.estimated_savings,
  og.created_at,
  og.approved_at,
  JSON_LENGTH(og.trips) as trip_count,
  u.name as created_by_name
FROM optimization_groups og
LEFT JOIN users u ON og.created_by = u.id;

CREATE OR REPLACE VIEW v_user_trip_stats AS
SELECT 
  user_id,
  user_name,
  user_email,
  COUNT(*) as total_trips,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_trips,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_trips,
  SUM(CASE WHEN status = 'optimized' THEN 1 ELSE 0 END) as optimized_trips,
  SUM(estimated_cost) as total_estimated_cost,
  SUM(actual_cost) as total_actual_cost,
  MAX(created_at) as last_trip_date
FROM trips
GROUP BY user_id, user_name, user_email;

-- Grant privileges
GRANT ALL PRIVILEGES ON trips_management.* TO 'trips_user'@'%';
FLUSH PRIVILEGES;

-- Insert sample data for testing (optional)
-- Uncomment below to add demo data on first run

/*
INSERT INTO trips (id, user_id, user_name, user_email, departure_location, destination, departure_date, departure_time, return_date, return_time, status, vehicle_type, estimated_cost, notified, data_type) VALUES
  ('demo-trip-001', 'user-demo-1', 'Nguyen Van An', 'nguyen.van.an@intersnack.com.vn', 'HCM Office', 'Phan Thiet Factory', DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:00:00', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '17:00:00', 'pending', 'car-4', 1200000.00, FALSE, 'raw'),
  ('demo-trip-002', 'user-demo-2', 'Tran Thi Binh', 'tran.thi.binh@intersnack.com.vn', 'HCM Office', 'Phan Thiet Factory', DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:30:00', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '17:00:00', 'pending', 'car-4', 1200000.00, FALSE, 'raw'),
  ('demo-trip-003', 'user-demo-3', 'Le Van Cuong', 'le.van.cuong@intersnack.com.vn', 'HCM Office', 'Long An Factory', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:00:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '18:00:00', 'confirmed', 'car-4', 400000.00, TRUE, 'raw');
*/

SELECT 'Database initialization completed successfully!' as message;
