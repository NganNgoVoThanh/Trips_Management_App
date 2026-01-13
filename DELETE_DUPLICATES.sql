-- ==========================================
-- DELETE DUPLICATE TRIPS
-- ==========================================
-- Chạy script này trong MySQL để xóa duplicate trips
-- Giữ lại trip có ID nhỏ nhất (oldest trip)

-- Step 1: CHECK duplicates trước khi xóa
SELECT
    user_email,
    departure_location,
    destination,
    departure_date,
    COUNT(*) as count,
    GROUP_CONCAT(id ORDER BY id) as trip_ids
FROM trips
GROUP BY user_email, departure_location, destination, departure_date
HAVING COUNT(*) > 1;

-- Expected result: 4 groups
-- dieu.le@intersnack.com.vn: HCM Office → Long An Factory, 2026-01-12 (2 trips)
-- dieu.le@intersnack.com.vn: Phan Thiet Factory → Tay Ninh Factory, 2026-01-19 (3 trips)
-- ngan.ngo@intersnack.com.vn: HCM Office → Long An Factory, 2026-01-12 (2 trips)
-- ngan.ngo@intersnack.com.vn: Phan Thiet Factory → Tay Ninh Factory, 2026-01-19 (3 trips)

-- ==========================================
-- Step 2: DELETE duplicates (keeps oldest trip with smallest ID)
-- ==========================================

DELETE t1 FROM trips t1
INNER JOIN trips t2
WHERE t1.id > t2.id
  AND t1.user_email = t2.user_email
  AND t1.departure_location = t2.departure_location
  AND t1.destination = t2.destination
  AND t1.departure_date = t2.departure_date;

-- Expected result: Query OK, 6 rows affected
-- (2 duplicates for dieu.le HCM-Long An)
-- (3 duplicates for dieu.le Phan Thiet-Tay Ninh)
-- (2 duplicates for ngan.ngo HCM-Long An)
-- (3 duplicates for ngan.ngo Phan Thiet-Tay Ninh)
-- TOTAL: 1 + 2 + 1 + 2 = 6 duplicates deleted

-- ==========================================
-- Step 3: VERIFY no more duplicates
-- ==========================================

SELECT
    user_email,
    departure_location,
    destination,
    departure_date,
    COUNT(*) as count
FROM trips
GROUP BY user_email, departure_location, destination, departure_date
HAVING COUNT(*) > 1;

-- Expected result: 0 rows (no duplicates)

-- ==========================================
-- Step 4: CHECK total trips count
-- ==========================================

SELECT COUNT(*) as total_trips FROM trips;

-- Expected result: 8 trips
-- (14 original - 6 duplicates = 8 trips)

-- ==========================================
-- Step 5: CHECK status distribution
-- ==========================================

SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;

-- Expected result:
-- pending_approval: ?
-- approved: ?
-- (Depends on which duplicates were deleted)
