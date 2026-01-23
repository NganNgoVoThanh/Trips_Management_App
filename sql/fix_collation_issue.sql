-- ============================================
-- FIX COLLATION ISSUE FOR STORED PROCEDURES
-- ============================================
-- This script fixes the collation mismatch error:
-- "Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT) and (utf8mb4_general_ci,IMPLICIT)"
-- ============================================

-- Step 1: Check current collation of database and tables
SELECT 'Checking database collation...' AS status;
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = DATABASE();

SELECT 'Checking table collations...' AS status;
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT 'Checking column collations...' AS status;
SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLLATION_NAME IS NOT NULL
  AND COLLATION_NAME != 'utf8mb4_unicode_ci'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Step 2: Drop existing stored procedures if they exist
SELECT 'Dropping existing stored procedures...' AS status;

DROP PROCEDURE IF EXISTS sp_grant_admin_role;
DROP PROCEDURE IF EXISTS sp_revoke_admin_role;

-- Step 3: Create sp_grant_admin_role with explicit collation
SELECT 'Creating sp_grant_admin_role...' AS status;

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
    DECLARE v_user_id INT;
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

DELIMITER ;

-- Step 4: Create sp_revoke_admin_role with explicit collation
SELECT 'Creating sp_revoke_admin_role...' AS status;

DELIMITER $$

CREATE PROCEDURE sp_revoke_admin_role(
    IN p_user_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_performed_by_email VARCHAR(255) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_reason TEXT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ip_address VARCHAR(50) CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_user_agent TEXT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_user_id INT;
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
        admin_type = 'none',
        admin_location_id = NULL,
        admin_assigned_at = NULL,
        admin_assigned_by = NULL,
        updated_at = NOW()
    WHERE email = p_user_email COLLATE utf8mb4_unicode_ci;

    -- Log to admin audit
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
        'REVOKE_ADMIN',
        p_user_email,
        v_user_name,
        v_previous_admin_type,
        'none',
        v_previous_location_id,
        NULL,
        p_performed_by_email,
        NULL,
        p_reason,
        p_ip_address
    );
END$$

DELIMITER ;

-- Step 5: Verify stored procedures were created
SELECT 'Verifying stored procedures...' AS status;
SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role');

SELECT 'Collation fix completed successfully!' AS final_status;
