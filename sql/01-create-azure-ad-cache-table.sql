-- ============================================
-- AZURE AD USERS CACHE TABLE
-- ============================================
-- Bảng này lưu TẤT CẢ users từ Azure AD (toàn công ty)
-- Dùng cho dropdown chọn manager
-- Sync hàng ngày từ Azure AD

CREATE TABLE IF NOT EXISTS azure_ad_users_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  azure_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Azure AD Object ID (oid)',
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,

  -- Azure AD fields (có thể NULL vì User.ReadBasic.All không trả về)
  department VARCHAR(100) DEFAULT NULL,
  office_location VARCHAR(100) DEFAULT NULL,
  job_title VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE COMMENT 'accountEnabled từ Azure AD',
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_display_name (display_name),
  INDEX idx_department (department),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cache tất cả users từ Azure AD cho dropdown chọn manager';
