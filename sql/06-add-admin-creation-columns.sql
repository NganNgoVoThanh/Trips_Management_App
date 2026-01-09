-- ============================================
-- ADD ADMIN CREATION FIELDS
-- ============================================
-- Add missing columns for trips created by admin
-- Fixes "Unknown column 'notes'" error

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE COMMENT 'Created by admin on behalf of user',
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) DEFAULT NULL COMMENT 'Email of the admin who created the trip',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL COMMENT 'Admin notes for the trip';

-- Add index for reporting
CREATE INDEX IF NOT EXISTS idx_created_by_admin ON trips(created_by_admin);
