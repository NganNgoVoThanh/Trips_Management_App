-- Check Optimization Flow Issues

-- 1. Check TEMP trips (should be deleted after approval)
SELECT
  'TEMP TRIPS' as category,
  COUNT(*) as count,
  GROUP_CONCAT(DISTINCT optimized_group_id) as group_ids
FROM temp_trips;

-- 2. Check trips with optimizedGroupId (should have status 'optimized' after approval)
SELECT
  status,
  data_type,
  COUNT(*) as count
FROM trips
WHERE optimized_group_id IS NOT NULL AND optimized_group_id != ''
GROUP BY status, data_type;

-- 3. Check optimization groups and their status
SELECT
  id,
  status,
  trips,
  created_at,
  approved_at
FROM optimization_groups
ORDER BY created_at DESC
LIMIT 5;

-- 4. Find duplicate trips (same user, route, date, time)
SELECT
  user_name,
  departure_location,
  destination,
  departure_date,
  departure_time,
  status,
  data_type,
  optimized_group_id,
  COUNT(*) as count
FROM trips
WHERE departure_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY user_name, departure_location, destination, departure_date, departure_time, status, data_type
HAVING count > 1;

-- 5. Check Pending Actions candidates (should exclude temp and admin-created)
SELECT
  user_name,
  status,
  data_type,
  created_by_admin,
  auto_approved,
  optimized_group_id,
  created_at
FROM trips
WHERE status IN ('pending_approval', 'pending_urgent')
ORDER BY created_at DESC
LIMIT 10;
