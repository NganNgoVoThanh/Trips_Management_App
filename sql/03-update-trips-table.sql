-- ============================================
-- UPDATE TRIPS TABLE
-- ============================================
-- Thêm các fields mới cho email approval workflow

-- Thêm field cc_emails (JSON array)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cc_emails JSON DEFAULT NULL COMMENT 'Danh sách email CC khi gửi approval';

-- Thêm field is_urgent (Boolean)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE COMMENT 'Trip gấp (< 24h)';

-- Thêm field auto_approved (Boolean)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE COMMENT 'Tự động duyệt (CEO, không có manager)';

-- Thêm field auto_approved_reason
ALTER TABLE trips ADD COLUMN IF NOT EXISTS auto_approved_reason VARCHAR(255) DEFAULT NULL COMMENT 'Lý do tự động duyệt';

-- Thêm field manager info cho approval workflow
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255) DEFAULT NULL COMMENT 'Email manager phê duyệt';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT NULL COMMENT 'Trạng thái phê duyệt';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_token VARCHAR(500) DEFAULT NULL COMMENT 'JWT token cho approval link';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_token_expires DATETIME DEFAULT NULL COMMENT 'Token hết hạn sau 48h';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP NULL COMMENT 'Thời điểm manager duyệt';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_rejection_reason TEXT DEFAULT NULL COMMENT 'Lý do từ chối';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_is_urgent ON trips(is_urgent);
CREATE INDEX IF NOT EXISTS idx_manager_approval_status ON trips(manager_approval_status);
CREATE INDEX IF NOT EXISTS idx_manager_email ON trips(manager_email);
