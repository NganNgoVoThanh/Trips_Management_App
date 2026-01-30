-- ============================================
-- FIX STORED PROCEDURES FOR admin_audit_log
-- ============================================
-- Problem: admin_audit_log.id is INT but stored procedures
-- are trying to insert UUID() which returns string
--
-- Solution: Use NULL for id to let auto-increment handle it
-- ============================================

SELECT '=== Fixing Stored Procedures ===' AS '';

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

    -- Use NULL for id to let auto-increment handle it
    INSERT INTO admin_audit_log (
        action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, performed_by_name,
        reason, ip_address
    ) VALUES (
        'grant_admin', p_user_email, v_user_name,
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

    -- Use NULL for id to let auto-increment handle it
    INSERT INTO admin_audit_log (
        action_type, target_user_email, target_user_name,
        previous_admin_type, new_admin_type,
        previous_location_id, new_location_id,
        performed_by_email, reason, ip_address, user_agent
    ) VALUES (
        'revoke_admin', p_user_email, v_user_name,
        v_previous_admin_type, NULL,
        v_previous_location_id, NULL,
        p_performed_by_email, p_reason, p_ip_address, p_user_agent
    );
END$$

DELIMITER ;

SELECT '✅ Stored procedures fixed!' AS status;

-- Verify
SELECT '=== Verifying procedures ===' AS '';
SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role');
