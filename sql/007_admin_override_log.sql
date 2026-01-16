-- Migration: Create/Update admin_override_log table for Manual Override feature
-- This table tracks all admin manual override actions for expired trip approvals

-- Create table if not exists
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

    -- Indexes for efficient querying
    INDEX idx_trip_id (trip_id),
    INDEX idx_admin_email (admin_email),
    INDEX idx_created_at (created_at),
    INDEX idx_action_type (action_type),
    INDEX idx_override_reason (override_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add columns if they don't exist (for existing tables)
-- Note: Run each ALTER separately to avoid errors if column already exists

-- Add action_type column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'action_type');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN action_type ENUM(''approve'', ''reject'') NOT NULL DEFAULT ''approve'' AFTER trip_id',
    'SELECT ''action_type column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add override_reason column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'override_reason');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN override_reason VARCHAR(100) DEFAULT ''EXPIRED_APPROVAL_LINK''',
    'SELECT ''override_reason column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add user_email column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'user_email');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN user_email VARCHAR(255)',
    'SELECT ''user_email column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add user_name column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'user_name');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN user_name VARCHAR(255)',
    'SELECT ''user_name column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add manager_email column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'manager_email');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN manager_email VARCHAR(255)',
    'SELECT ''manager_email column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add created_at column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'admin_override_log' AND column_name = 'created_at');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE admin_override_log ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'SELECT ''created_at column already exists''');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify table structure
DESCRIBE admin_override_log;

-- Show indexes
SHOW INDEX FROM admin_override_log;
