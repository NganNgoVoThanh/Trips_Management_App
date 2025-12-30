-- ============================================
-- USERS TABLE
-- ============================================
-- Bảng này chỉ lưu users ĐÃ ĐĂNG NHẬP vào hệ thống
-- Chứa thông tin profile đầy đủ

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Azure AD linking
  azure_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Azure AD Object ID (oid)',
  email VARCHAR(255) UNIQUE NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'EMP + hash từ email',

  -- Basic info
  name VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,

  -- Azure AD synced fields (read-only)
  department VARCHAR(100) DEFAULT NULL COMMENT 'Từ Azure AD, read-only',
  office_location VARCHAR(100) DEFAULT NULL COMMENT 'Từ Azure AD, read-only',
  job_title VARCHAR(100) DEFAULT NULL COMMENT 'Từ Azure AD, read-only',

  -- Manager info (user tự chọn)
  manager_azure_id VARCHAR(255) DEFAULT NULL COMMENT 'Azure ID của manager',
  manager_email VARCHAR(255) DEFAULT NULL,
  manager_name VARCHAR(255) DEFAULT NULL,

  -- Contact info (user tự nhập)
  phone VARCHAR(50) DEFAULT NULL,
  pickup_address TEXT DEFAULT NULL COMMENT 'JSON: {street, ward, district, city}',
  pickup_notes TEXT DEFAULT NULL,

  -- Profile setup status
  profile_completed BOOLEAN DEFAULT FALSE COMMENT 'Đã hoàn thành wizard setup chưa',

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_manager_email (manager_email),
  INDEX idx_department (department),
  INDEX idx_profile_completed (profile_completed),

  -- Foreign key (optional, tham chiếu đến azure_ad_users_cache)
  FOREIGN KEY (manager_azure_id) REFERENCES azure_ad_users_cache(azure_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Users đã đăng nhập vào hệ thống';
