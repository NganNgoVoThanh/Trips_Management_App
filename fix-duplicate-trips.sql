-- Fix Duplicate Trips Created by Optimization
-- RUN THIS TO CLEAN UP EXISTING DUPLICATES

-- Step 1: Find and display duplicate trips (for review)
SELECT
  'DUPLICATE TRIPS TO DELETE' as action,
  t1.id as old_trip_id,
  t1.user_name,
  t1.status as old_status,
  t1.departure_time as old_time,
  t2.id as new_trip_id,
  t2.status as new_status,
  t2.departure_time as new_time
FROM trips t1
JOIN trips t2 ON
  t1.user_name = t2.user_name AND
  t1.departure_location = t2.departure_location AND
  t1.destination = t2.destination AND
  t1.departure_date = t2.departure_date AND
  t1.id != t2.id
WHERE
  t1.optimized_group_id IS NOT NULL AND
  t2.optimized_group_id IS NOT NULL AND
  t1.optimized_group_id = t2.optimized_group_id
ORDER BY t1.user_name, t1.departure_date;

-- Step 2: Delete old trips that have been replaced by optimized versions
-- Keep the trip with status 'optimized', delete others
DELETE t1 FROM trips t1
JOIN trips t2 ON
  t1.user_name = t2.user_name AND
  t1.departure_location = t2.departure_location AND
  t1.destination = t2.destination AND
  t1.departure_date = t2.departure_date AND
  t1.optimized_group_id = t2.optimized_group_id AND
  t1.id != t2.id
WHERE
  t1.status != 'optimized' AND
  t2.status = 'optimized';

-- Step 3: Verify - should see only ONE trip per person/route/date with optimized status
SELECT
  user_name,
  departure_location,
  destination,
  departure_date,
  departure_time,
  status,
  data_type,
  optimized_group_id
FROM trips
WHERE optimized_group_id IS NOT NULL
ORDER BY user_name, departure_date, departure_time;
