-- ============================================
-- CREATE MISSING DATABASE OBJECTS
-- For Trips Management System
-- ============================================

USE tripsmgm-mydb002;

-- ============================================
-- 1. LOCATIONS TABLE
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default locations
INSERT IGNORE INTO locations (id, name, code, address, province, active) VALUES
  ('LOC-HCM-001', 'Ho Chi Minh Office', 'HCM', '123 Nguyen Hue, District 1', 'Ho Chi Minh City', TRUE),
  ('LOC-HAN-001', 'Hanoi Office', 'HAN', '456 Ba Dinh Square', 'Hanoi', TRUE),
  ('LOC-DNA-001', 'Da Nang Office', 'DNA', '789 Bach Dang Street', 'Da Nang', TRUE),
  ('LOC-VT-001', 'Vung Tau Factory', 'VT', 'Industrial Zone A', 'Ba Ria - Vung Tau', TRUE),
  ('LOC-BD-001', 'Binh Duong Factory', 'BD', 'Vietnam Singapore Industrial Park', 'Binh Duong', TRUE);

-- ============================================
-- 2. ADMIN_AUDIT_LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_type ENUM('grant_admin', 'revoke_admin', 'update_admin', 'change_location') NOT NULL,
  target_user_email VARCHAR(255) NOT NULL,
  target_user_name VARCHAR(255),
  previous_admin_type ENUM('admin', 'super_admin', 'location_admin', NULL),
  new_admin_type ENUM('admin', 'super_admin', 'location_admin', NULL),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. ADD MISSING COLUMNS TO USERS TABLE
-- ============================================

-- Add admin_location_id column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'admin_location_id') > 0,
  'SELECT 1', -- Column exists, do nothing
  'ALTER TABLE users ADD COLUMN admin_location_id VARCHAR(255) AFTER admin_type'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add admin_assigned_at column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'admin_assigned_at') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN admin_assigned_at TIMESTAMP NULL AFTER admin_location_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add admin_assigned_by column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'admin_assigned_by') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN admin_assigned_by VARCHAR(255) AFTER admin_assigned_at'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index on admin_location_id
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND INDEX_NAME = 'idx_admin_location') > 0,
  'SELECT 1',
  'CREATE INDEX idx_admin_location ON users(admin_location_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 4. CREATE VIEW: v_active_admins
-- ============================================

DROP VIEW IF EXISTS v_active_admins;

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
ORDER BY u.admin_type, u.name;

-- ============================================
-- 5. STORED PROCEDURE: sp_grant_admin_role
-- ============================================

DROP PROCEDURE IF EXISTS sp_grant_admin_role;

DELIMITER $$

CREATE PROCEDURE sp_grant_admin_role(
  IN p_user_email VARCHAR(255),
  IN p_admin_type ENUM('admin', 'super_admin', 'location_admin'),
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

  -- Start transaction
  START TRANSACTION;

  -- Check if user exists
  SELECT COUNT(*), name, admin_type, admin_location_id
  INTO v_user_exists, v_user_name, v_previous_admin_type, v_previous_location_id
  FROM users
  WHERE email = p_user_email
  LIMIT 1;

  IF v_user_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User not found';
  END IF;

  -- Update user role and admin type
  UPDATE users
  SET
    role = 'admin',
    admin_type = p_admin_type,
    admin_location_id = p_location_id,
    admin_assigned_at = CURRENT_TIMESTAMP,
    admin_assigned_by = p_performed_by_email,
    updated_at = CURRENT_TIMESTAMP
  WHERE email = p_user_email;

  -- Log the action
  INSERT INTO admin_audit_log (
    action_type,
    target_user_email,
    target_user_name,
    previous_admin_type,
    new_admin_type,
    previous_location_id,
    new_location_id,
    performed_by_email,
    performed_by_name,
    reason,
    ip_address
  ) VALUES (
    'grant_admin',
    p_user_email,
    v_user_name,
    v_previous_admin_type,
    p_admin_type,
    v_previous_location_id,
    p_location_id,
    p_performed_by_email,
    p_performed_by_name,
    p_reason,
    p_ip_address
  );

  -- Commit transaction
  COMMIT;

  -- Return success
  SELECT 'Admin role granted successfully' AS message;
END$$

DELIMITER ;

-- ============================================
-- 6. STORED PROCEDURE: sp_revoke_admin_role
-- ============================================

DROP PROCEDURE IF EXISTS sp_revoke_admin_role;

DELIMITER $$

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

  -- Start transaction
  START TRANSACTION;

  -- Check if user exists and get current admin info
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

  -- Revoke admin role
  UPDATE users
  SET
    role = 'user',
    admin_type = NULL,
    admin_location_id = NULL,
    admin_assigned_at = NULL,
    admin_assigned_by = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE email = p_user_email;

  -- Log the action
  INSERT INTO admin_audit_log (
    action_type,
    target_user_email,
    target_user_name,
    previous_admin_type,
    new_admin_type,
    previous_location_id,
    new_location_id,
    performed_by_email,
    performed_by_name,
    reason,
    ip_address
  ) VALUES (
    'revoke_admin',
    p_user_email,
    v_user_name,
    v_previous_admin_type,
    NULL,
    v_previous_location_id,
    NULL,
    p_performed_by_email,
    p_performed_by_name,
    p_reason,
    p_ip_address
  );

  -- Commit transaction
  COMMIT;

  -- Return success
  SELECT 'Admin role revoked successfully' AS message;
END$$

DELIMITER ;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Database objects created successfully!' AS status;

-- Show tables
SELECT TABLE_NAME, TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('locations', 'admin_audit_log')
ORDER BY TABLE_NAME;

-- Show view
SELECT TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'v_active_admins';

-- Show stored procedures
SELECT ROUTINE_NAME, ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
ORDER BY ROUTINE_NAME;

-- Show new columns in users table
SELECT COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
ORDER BY ORDINAL_POSITION;
