-- Add user_agent column to approval_audit_log table
-- This column is needed for security auditing and tracking requests

USE trips_management;

-- Check if column exists before adding
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'approval_audit_log'
    AND COLUMN_NAME = 'user_agent'
);

-- Add column if it doesn't exist
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE approval_audit_log ADD COLUMN user_agent TEXT NULL AFTER ip_address',
  'SELECT "Column user_agent already exists in approval_audit_log" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify column was added
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Column user_agent exists in approval_audit_log'
    ELSE '❌ Column user_agent still missing from approval_audit_log'
  END AS status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'approval_audit_log'
  AND COLUMN_NAME = 'user_agent';

SELECT 'Migration complete: Added user_agent column to approval_audit_log' AS result;
