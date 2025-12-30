-- =====================================================
-- ADMIN MANAGEMENT SYSTEM
-- Super Admin + Location-based Admin Hierarchy
-- =====================================================
-- Version: 1.0
-- Date: 2025-12-26
-- Description: Schema for managing Super Admins and Location Admins
-- =====================================================

-- =====================================================
-- STEP 1: CREATE LOCATIONS TABLE
-- =====================================================
-- Định nghĩa các địa điểm/factory trong công ty

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  province VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default locations
INSERT INTO locations (id, name, code, province) VALUES
('loc-phan-thiet', 'Phan Thiết Factory', 'PT', 'Bình Thuận'),
('loc-tay-ninh', 'Tây Ninh Factory', 'TN', 'Tây Ninh'),
('loc-long-an', 'Long An Factory', 'LA', 'Long An'),
('loc-ho-chi-minh', 'Hồ Chí Minh Office', 'HCM', 'Hồ Chí Minh')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  province = VALUES(province);

-- =====================================================
-- STEP 2: UPDATE USERS TABLE
-- =====================================================
-- Thêm columns cho admin management

ALTER TABLE users
ADD COLUMN IF NOT EXISTS admin_type ENUM('super_admin', 'location_admin', 'none') DEFAULT 'none' AFTER role,
ADD COLUMN IF NOT EXISTS admin_location_id VARCHAR(50) NULL AFTER admin_type,
ADD COLUMN IF NOT EXISTS admin_assigned_at TIMESTAMP NULL AFTER admin_location_id,
ADD COLUMN IF NOT EXISTS admin_assigned_by VARCHAR(255) NULL AFTER admin_assigned_at;

-- Add foreign key constraint
ALTER TABLE users
ADD CONSTRAINT fk_users_admin_location
FOREIGN KEY (admin_location_id) REFERENCES locations(id)
ON DELETE SET NULL;

-- Add indexes
CREATE INDEX idx_users_admin_type ON users(admin_type);
CREATE INDEX idx_users_admin_location ON users(admin_location_id);

-- =====================================================
-- STEP 3: CREATE ADMIN_AUDIT_LOG TABLE
-- =====================================================
-- Log tất cả thay đổi về admin roles

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  action_type ENUM('grant_admin', 'revoke_admin', 'change_location', 'promote_super_admin', 'demote_to_location_admin') NOT NULL,
  target_user_id VARCHAR(255) NOT NULL,
  target_user_email VARCHAR(255) NOT NULL,
  target_user_name VARCHAR(255),
  previous_admin_type ENUM('super_admin', 'location_admin', 'none'),
  new_admin_type ENUM('super_admin', 'location_admin', 'none'),
  previous_location_id VARCHAR(50),
  new_location_id VARCHAR(50),
  performed_by_user_id VARCHAR(255) NOT NULL,
  performed_by_email VARCHAR(255) NOT NULL,
  performed_by_name VARCHAR(255),
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_target_user (target_user_id),
  INDEX idx_performed_by (performed_by_user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at),

  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STEP 4: CREATE ADMIN_PERMISSIONS TABLE
-- =====================================================
-- Định nghĩa chi tiết quyền của từng admin type

CREATE TABLE IF NOT EXISTS admin_permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_type ENUM('super_admin', 'location_admin') NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(200) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_permission (admin_type, permission_key),
  INDEX idx_admin_type (admin_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions
INSERT INTO admin_permissions (admin_type, permission_key, permission_name, description) VALUES
-- Super Admin permissions
('super_admin', 'manage_all_trips', 'Manage All Trips', 'Can view, approve, reject trips from all locations'),
('super_admin', 'manage_admins', 'Manage Admins', 'Can add, remove, promote/demote admins'),
('super_admin', 'manage_locations', 'Manage Locations', 'Can create, update, delete locations'),
('super_admin', 'view_all_users', 'View All Users', 'Can view all users across all locations'),
('super_admin', 'view_analytics', 'View Global Analytics', 'Can view analytics for all locations'),
('super_admin', 'system_settings', 'System Settings', 'Can modify system-wide settings'),

-- Location Admin permissions
('location_admin', 'manage_location_trips', 'Manage Location Trips', 'Can view, approve, reject trips for assigned location only'),
('location_admin', 'view_location_users', 'View Location Users', 'Can view users in assigned location'),
('location_admin', 'view_location_analytics', 'View Location Analytics', 'Can view analytics for assigned location only')
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  description = VALUES(description);

-- =====================================================
-- STEP 5: MIGRATE EXISTING ADMINS
-- =====================================================
-- Chuyển admin hiện tại thành super_admin

UPDATE users
SET
  admin_type = 'super_admin',
  admin_assigned_at = NOW(),
  admin_assigned_by = 'system-migration'
WHERE role = 'admin';

-- =====================================================
-- STEP 6: CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Active Admins with Location Info
CREATE OR REPLACE VIEW v_active_admins AS
SELECT
  u.id,
  u.email,
  u.name,
  u.employee_id,
  u.role,
  u.admin_type,
  u.department,
  u.office_location,
  l.id as location_id,
  l.name as location_name,
  l.code as location_code,
  l.province as location_province,
  u.admin_assigned_at,
  u.admin_assigned_by,
  u.last_login_at
FROM users u
LEFT JOIN locations l ON u.admin_location_id = l.id
WHERE u.admin_type IN ('super_admin', 'location_admin')
  AND u.role = 'admin'
ORDER BY
  CASE u.admin_type
    WHEN 'super_admin' THEN 1
    WHEN 'location_admin' THEN 2
  END,
  l.name;

-- View: Admin Statistics
CREATE OR REPLACE VIEW v_admin_statistics AS
SELECT
  admin_type,
  COUNT(*) as admin_count,
  COUNT(DISTINCT admin_location_id) as locations_count
FROM users
WHERE admin_type IN ('super_admin', 'location_admin')
  AND role = 'admin'
GROUP BY admin_type;

-- =====================================================
-- STEP 7: CREATE STORED PROCEDURES
-- =====================================================

DELIMITER //

-- Procedure: Grant Admin Role
CREATE PROCEDURE sp_grant_admin_role(
  IN p_target_user_email VARCHAR(255),
  IN p_admin_type ENUM('super_admin', 'location_admin'),
  IN p_location_id VARCHAR(50),
  IN p_performed_by_email VARCHAR(255),
  IN p_reason TEXT,
  IN p_ip_address VARCHAR(45),
  IN p_user_agent TEXT
)
BEGIN
  DECLARE v_target_user_id VARCHAR(255);
  DECLARE v_target_user_name VARCHAR(255);
  DECLARE v_performed_by_id VARCHAR(255);
  DECLARE v_performed_by_name VARCHAR(255);
  DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
  DECLARE v_previous_location_id VARCHAR(50);

  -- Get target user info
  SELECT id, name, admin_type, admin_location_id
  INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id
  FROM users WHERE email = p_target_user_email LIMIT 1;

  -- Get performer info
  SELECT id, name INTO v_performed_by_id, v_performed_by_name
  FROM users WHERE email = p_performed_by_email LIMIT 1;

  -- Update user
  UPDATE users
  SET
    role = 'admin',
    admin_type = p_admin_type,
    admin_location_id = p_location_id,
    admin_assigned_at = NOW(),
    admin_assigned_by = v_performed_by_id,
    updated_at = NOW()
  WHERE email = p_target_user_email;

  -- Log audit
  INSERT INTO admin_audit_log (
    action_type, target_user_id, target_user_email, target_user_name,
    previous_admin_type, new_admin_type,
    previous_location_id, new_location_id,
    performed_by_user_id, performed_by_email, performed_by_name,
    reason, ip_address, user_agent
  ) VALUES (
    'grant_admin', v_target_user_id, p_target_user_email, v_target_user_name,
    v_previous_admin_type, p_admin_type,
    v_previous_location_id, p_location_id,
    v_performed_by_id, p_performed_by_email, v_performed_by_name,
    p_reason, p_ip_address, p_user_agent
  );
END //

-- Procedure: Revoke Admin Role
CREATE PROCEDURE sp_revoke_admin_role(
  IN p_target_user_email VARCHAR(255),
  IN p_performed_by_email VARCHAR(255),
  IN p_reason TEXT,
  IN p_ip_address VARCHAR(45),
  IN p_user_agent TEXT
)
BEGIN
  DECLARE v_target_user_id VARCHAR(255);
  DECLARE v_target_user_name VARCHAR(255);
  DECLARE v_performed_by_id VARCHAR(255);
  DECLARE v_performed_by_name VARCHAR(255);
  DECLARE v_previous_admin_type ENUM('super_admin', 'location_admin', 'none');
  DECLARE v_previous_location_id VARCHAR(50);

  -- Get target user info
  SELECT id, name, admin_type, admin_location_id
  INTO v_target_user_id, v_target_user_name, v_previous_admin_type, v_previous_location_id
  FROM users WHERE email = p_target_user_email LIMIT 1;

  -- Get performer info
  SELECT id, name INTO v_performed_by_id, v_performed_by_name
  FROM users WHERE email = p_performed_by_email LIMIT 1;

  -- Update user back to regular user
  UPDATE users
  SET
    role = 'user',
    admin_type = 'none',
    admin_location_id = NULL,
    admin_assigned_at = NULL,
    admin_assigned_by = NULL,
    updated_at = NOW()
  WHERE email = p_target_user_email;

  -- Log audit
  INSERT INTO admin_audit_log (
    action_type, target_user_id, target_user_email, target_user_name,
    previous_admin_type, new_admin_type,
    previous_location_id, new_location_id,
    performed_by_user_id, performed_by_email, performed_by_name,
    reason, ip_address, user_agent
  ) VALUES (
    'revoke_admin', v_target_user_id, p_target_user_email, v_target_user_name,
    v_previous_admin_type, 'none',
    v_previous_location_id, NULL,
    v_performed_by_id, p_performed_by_email, v_performed_by_name,
    p_reason, p_ip_address, p_user_agent
  );
END //

DELIMITER ;

-- =====================================================
-- STEP 8: VERIFICATION QUERIES
-- =====================================================

-- Check current admins
SELECT
  email, name, role, admin_type,
  (SELECT name FROM locations WHERE id = users.admin_location_id) as location,
  admin_assigned_at
FROM users
WHERE admin_type != 'none' OR role = 'admin'
ORDER BY admin_type, email;

-- Check locations
SELECT * FROM locations ORDER BY code;

-- Check permissions
SELECT admin_type, permission_key, permission_name
FROM admin_permissions
ORDER BY admin_type, permission_key;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
