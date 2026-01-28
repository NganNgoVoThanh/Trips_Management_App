-- ============================================
-- CHECK AND FIX admin_audit_log TABLE
-- ============================================

-- Check current schema
SELECT '=== CURRENT admin_audit_log SCHEMA ===' AS '';

DESCRIBE admin_audit_log;

-- ============================================
-- FIX: Change id from INT to VARCHAR(255)
-- ============================================

-- Check if id is INT type
SET @col_type = (
  SELECT DATA_TYPE
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'admin_audit_log'
  AND column_name = 'id'
);

SELECT CONCAT('Current id column type: ', @col_type) AS status;

-- Alter if needed
SET @query = IF(@col_type = 'int',
  'ALTER TABLE admin_audit_log MODIFY COLUMN id VARCHAR(255) PRIMARY KEY',
  'SELECT "id column already VARCHAR" as info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ admin_audit_log.id column fixed to VARCHAR(255)' AS status;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '=== UPDATED admin_audit_log SCHEMA ===' AS '';

DESCRIBE admin_audit_log;
