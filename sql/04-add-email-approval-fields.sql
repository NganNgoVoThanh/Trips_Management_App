-- sql/04-add-email-approval-fields.sql
-- Add email approval workflow fields to trips table

-- Add new columns for email approval workflow
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_approval_token VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_approval_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manager_approved_by VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cc_emails JSON DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT NULL;

-- Modify status ENUM to include 'approved' and 'rejected'
ALTER TABLE trips
MODIFY COLUMN status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft', 'approved', 'rejected') DEFAULT 'pending';

-- Add indexes for better query performance
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_manager_approval_status (manager_approval_status),
ADD INDEX IF NOT EXISTS idx_is_urgent (is_urgent),
ADD INDEX IF NOT EXISTS idx_auto_approved (auto_approved);

-- Display confirmation
SELECT 'Email approval fields added successfully to trips table' AS status;
