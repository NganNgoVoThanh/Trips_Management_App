-- ============================================
-- PERFORMANCE OPTIMIZATION - COMPOSITE INDEXES
-- ============================================
-- Add composite indexes for common query patterns to improve performance
-- Created: 2026-01-23

USE trips_management;

-- ============================================
-- 1. TRIPS TABLE COMPOSITE INDEXES
-- ============================================

-- Index for optimization queries (status + departure_date)
-- Used in: getTrips with status filter and date sorting
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_status_departure_date (status, departure_date);

-- Index for user email + status lookups
-- Used in: getTripsForLocationAdmin, user-specific queries
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_user_email_status (user_email, status);

-- Index for location-based searches with date
-- Used in: Available trips filtering, optimization candidates
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_departure_dest_date (departure_location, destination, departure_date);

-- Index for optimization group queries with status
-- Used in: getOptimizationGroupsForLocationAdmin
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_optimized_group_status (optimized_group_id, status);

-- Index for user trips with status and date
-- Used in: User dashboard, my trips page
ALTER TABLE trips
ADD INDEX IF NOT EXISTS idx_user_status_date (user_id, status, departure_date);

-- ============================================
-- 2. TEMP_TRIPS TABLE COMPOSITE INDEXES
-- ============================================

-- Index for optimization group lookups
-- Used in: getTempTripsByGroupId, optimization approval flow
ALTER TABLE temp_trips
ADD INDEX IF NOT EXISTS idx_optimized_group_status (optimized_group_id, status);

-- Index for parent trip lookups with status
-- Used in: Linking temp trips to original trips
ALTER TABLE temp_trips
ADD INDEX IF NOT EXISTS idx_parent_trip_status (parent_trip_id, status);

-- ============================================
-- 3. JOIN_REQUESTS TABLE COMPOSITE INDEXES
-- ============================================

-- Index for requester + status lookups
-- Used in: getJoinRequests by user, filtering pending requests
ALTER TABLE join_requests
ADD INDEX IF NOT EXISTS idx_requester_status (requester_id, status);

-- Index for trip + status lookups
-- Used in: Finding join requests for specific trips
ALTER TABLE join_requests
ADD INDEX IF NOT EXISTS idx_trip_status (trip_id, status);

-- Index for created_at + status for sorting and filtering
-- Used in: Admin dashboard, recent requests
ALTER TABLE join_requests
ADD INDEX IF NOT EXISTS idx_status_created (status, created_at DESC);

-- ============================================
-- 4. OPTIMIZATION_GROUPS TABLE COMPOSITE INDEXES
-- ============================================

-- Index for status + departure date
-- Used in: Active optimization proposals, date-based filtering
ALTER TABLE optimization_groups
ADD INDEX IF NOT EXISTS idx_status_departure_date (status, departure_date);

-- Index for location-based optimization queries
ALTER TABLE optimization_groups
ADD INDEX IF NOT EXISTS idx_departure_dest (departure_location, destination);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all indexes on trips table
SELECT
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('trips', 'temp_trips', 'join_requests', 'optimization_groups')
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

SELECT '✅ Performance indexes created successfully!' as Status;
