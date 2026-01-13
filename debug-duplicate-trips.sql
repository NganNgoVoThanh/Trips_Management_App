-- Debug Duplicate Trips Issue

-- 1. Find duplicate trips (same user, route, date)
SELECT
  user_name,
  departure_location,
  destination,
  departure_date,
  departure_time,
  status,
  data_type,
  optimized_group_id,
  parent_trip_id,
  created_by_admin,
  id
FROM trips
WHERE user_name LIKE '%Dao Nguyen Anh%'
  AND departure_date >= '2026-01-28'
ORDER BY departure_date, departure_time;

-- 2. Check temp_trips table (should be empty after approval)
SELECT
  COUNT(*) as temp_count,
  GROUP_CONCAT(DISTINCT optimized_group_id) as group_ids
FROM temp_trips;

-- 3. Check optimization groups
SELECT
  id,
  status,
  trips,
  created_at,
  approved_at
FROM optimization_groups
ORDER BY created_at DESC
LIMIT 5;

-- 4. Find trips with parentTripId
SELECT
  id,
  user_name,
  status,
  data_type,
  parent_trip_id,
  optimized_group_id
FROM trips
WHERE parent_trip_id IS NOT NULL AND parent_trip_id != '';

-- 5. Count trips by status and dataType
SELECT
  status,
  data_type,
  COUNT(*) as count
FROM trips
GROUP BY status, data_type
ORDER BY status, data_type;
