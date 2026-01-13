-- Debug script: Kiểm tra trips và Pending Actions logic

-- 1. Xem tất cả trips với status pending
SELECT
  id,
  user_name,
  departure_location,
  destination,
  status,
  created_by_admin,
  auto_approved,
  manager_approval_status,
  created_at
FROM trips
WHERE status IN ('pending_approval', 'pending_urgent')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Xem trips do admin tạo
SELECT
  id,
  user_name,
  departure_location,
  destination,
  status,
  created_by_admin,
  auto_approved,
  admin_email,
  created_at
FROM trips
WHERE created_by_admin = 1
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check trips vừa tạo gần đây
SELECT
  id,
  user_name,
  status,
  created_by_admin,
  auto_approved,
  manager_approval_status,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
FROM trips
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY created_at DESC;
