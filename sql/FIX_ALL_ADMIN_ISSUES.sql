-- ============================================
-- FIX ALL ADMIN-RELATED ISSUES
-- ============================================
-- This script fixes all issues preventing admin grant/revoke:
-- 1. Fix admin_audit_log.id column (INT -> VARCHAR for UUID)
-- 2. Fix stored procedures with correct data types
-- 3. Ensure HCM office location exists
-- ============================================

SELECT '========================================' AS '';
SELECT 'STARTING ADMIN FIXES' AS status;
SELECT '========================================' AS '';

-- ============================================
-- STEP 1: FIX admin_audit_log.id COLUMN
-- ============================================

SELECT '=== STEP 1: Fix admin_audit_log.id column ===' AS '';

-- Check current type
SET @col_type = (
  SELECT DATA_TYPE
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'admin_audit_log'
  AND column_name = 'id'
);

SELECT CONCAT('Current admin_audit_log.id type: ', COALESCE(@col_type, 'NULL')) AS info;

-- Fix if INT
SET @query = IF(@col_type = 'int',
  'ALTER TABLE admin_audit_log MODIFY COLUMN id VARCHAR(255) PRIMARY KEY',
  'SELECT "✅ id column already VARCHAR" as status'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ admin_audit_log.id fixed to VARCHAR(255)' AS status;

-- ============================================
-- STEP 2: FIX STORED PROCEDURES
-- ============================================

SELECT '=== STEP 2: Recreate stored procedures ===' AS '';

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

    -- Get current user info
    SELECT id, name, admin_type, admin_location_id
    INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
    FROM users
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    -- Update user with admin role
    UPDATE users
    SET role = 'admin',
        admin_type = p_admin_type,
        admin_location_id = p_location_id,
        admin_assigned_at = NOW(),
        admin_assigned_by = p_performed_by_email,
        updated_at = NOW()
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

    -- Log to admin audit
    INSERT INTO admin_audit_log (
        id,
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
        UUID(),
        'GRANT_ADMIN',
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

    -- Get current user info
    SELECT id, name, admin_type, admin_location_id
    INTO v_user_id, v_user_name, v_previous_admin_type, v_previous_location_id
    FROM users
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    -- Update user to remove admin role
    UPDATE users
    SET role = 'user',
        admin_type = 'admin',
        admin_location_id = NULL,
        admin_assigned_at = NULL,
        admin_assigned_by = NULL,
        updated_at = NOW()
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

    -- Log to admin audit
    INSERT INTO admin_audit_log (
        id,
        action_type,
        target_user_email,
        target_user_name,
        previous_admin_type,
        new_admin_type,
        previous_location_id,
        new_location_id,
        performed_by_email,
        reason,
        ip_address,
        user_agent
    ) VALUES (
        UUID(),
        'REVOKE_ADMIN',
        p_user_email,
        v_user_name,
        v_previous_admin_type,
        'none',
        v_previous_location_id,
        NULL,
        p_performed_by_email,
        p_reason,
        p_ip_address,
        p_user_agent
    );
END$$

DELIMITER ;

SELECT '✅ Stored procedures recreated' AS status;

-- ============================================
-- STEP 3: ENSURE HCM OFFICE EXISTS
-- ============================================

SELECT '=== STEP 3: Check HCM Office location ===' AS '';

-- Check if hcm-office exists
SET @hcm_exists = (
  SELECT COUNT(*)
  FROM locations
  WHERE id = 'hcm-office'
);

SELECT IF(@hcm_exists > 0, '✅ hcm-office EXISTS', '⚠️ hcm-office MISSING - Adding now...') AS status;

-- Insert if missing
INSERT INTO locations (id, code, name, province, address, type, status, created_at, updated_at) VALUES
('hcm-office', 'HCM', 'Ho Chi Minh Office', 'Ho Chi Minh City',
 '76 Le Lai Street, Ben Thanh Ward, District 1, Ho Chi Minh City, Vietnam',
 'office', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  code = 'HCM',
  name = 'Ho Chi Minh Office',
  province = 'Ho Chi Minh City',
  type = 'office',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

SELECT '✅ HCM Office location verified' AS status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT '========================================' AS '';
SELECT 'VERIFICATION RESULTS' AS '';
SELECT '========================================' AS '';

-- Check admin_audit_log.id column
SELECT CONCAT('admin_audit_log.id type: ', DATA_TYPE) AS check_result
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = 'admin_audit_log'
AND column_name = 'id';

-- Check stored procedures
SELECT CONCAT('Stored procedures: ', COUNT(*), '/2') AS check_result
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role');

-- Check locations
SELECT CONCAT('App locations: ', COUNT(*), '/4') AS check_result
FROM locations
WHERE id IN ('hcm-office', 'phan-thiet-factory', 'long-an-factory', 'tay-ninh-factory')
AND status = 'active';

SELECT '========================================' AS '';
SELECT '✅ ALL FIXES COMPLETED' AS final_status;
SELECT '========================================' AS '';
