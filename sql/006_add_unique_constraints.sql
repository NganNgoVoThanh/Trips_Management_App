-- ============================================
-- Migration 006: Add UNIQUE constraints to prevent duplicate trips
-- ============================================
-- Purpose: Prevent race condition duplicate trip creation
-- Author: System Security Fix
-- Date: 2026-01-14

-- ============================================
-- 1. ADD UNIQUE CONSTRAINT ON TRIPS TABLE
-- ============================================
-- Prevents exact duplicate trips from same user at same time/location

ALTER TABLE trips
ADD CONSTRAINT uk_trip_details
UNIQUE (user_email, departure_location, destination, departure_date, departure_time);

-- Note: This prevents:
-- - Same user booking identical trip twice
-- - Race condition creating duplicates
-- - Accidental double-submissions

-- ============================================
-- 2. ADD INDEX FOR PERFORMANCE
-- ============================================
-- Speeds up duplicate checks and common queries

CREATE INDEX idx_trips_lookup
ON trips (user_email, departure_date, status);

-- ============================================
-- 3. ADD CONSTRAINT FOR JOIN REQUESTS
-- ============================================
-- Prevent same user requesting to join same trip multiple times

ALTER TABLE join_requests
ADD CONSTRAINT uk_join_request_user_trip
UNIQUE (trip_id, requester_id);

-- Note: This prevents:
-- - User submitting multiple join requests for same trip
-- - Duplicate join request race conditions

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================
-- Run these to verify constraints were added:

-- Check trips table constraints:
-- SHOW CREATE TABLE trips;

-- Check join_requests table constraints:
-- SHOW CREATE TABLE join_requests;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To remove these constraints if they cause issues:

-- ALTER TABLE trips DROP INDEX uk_trip_details;
-- DROP INDEX idx_trips_lookup ON trips;
-- ALTER TABLE join_requests DROP INDEX uk_join_request_user_trip;

-- ============================================
-- NOTES
-- ============================================
-- 1. Run this migration AFTER cleaning any existing duplicates
-- 2. Application code still does duplicate checks (defense in depth)
-- 3. These constraints work at database level - prevents ALL duplicate paths
-- 4. If constraint violation occurs, app will receive error and can handle gracefully
