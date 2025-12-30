-- sql/05-create-audit-log.sql
-- Create audit log table for tracking all approval actions

CREATE TABLE IF NOT EXISTS approval_audit_log (
  id VARCHAR(255) PRIMARY KEY,
  trip_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_trip_id (trip_id),
  INDEX idx_actor_email (actor_email),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),

  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Display confirmation
SELECT 'Audit log table created successfully' AS status;
