-- ============================================
-- RESET DATABASE FOR TESTING
-- ============================================
-- This script clears all user and trip data for fresh testing
-- while preserving configuration data (locations, vehicles)
--
-- ⚠️  WARNING: This will DELETE data!
-- Run this ONLY on development/test environment
-- DO NOT run on production!
--
-- Usage:
--   mysql -u username -p database_name < sql/RESET_DATABASE_FOR_TESTING.sql
-- ============================================

SELECT '========================================' AS '';
SELECT 'RESET DATABASE FOR TESTING' AS status;
SELECT DATABASE() as current_database;
SELECT NOW() as reset_time;
SELECT '========================================' AS '';

-- Show current record counts
SELECT '=== BEFORE RESET ===' AS '';

SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'trips' as table_name, COUNT(*) as record_count FROM trips
UNION ALL
SELECT 'join_requests' as table_name, COUNT(*) as record_count FROM join_requests
UNION ALL
SELECT 'approval_audit_log' as table_name, COUNT(*) as record_count FROM approval_audit_log
UNION ALL
SELECT 'admin_override_log' as table_name, COUNT(*) as record_count FROM admin_override_log
UNION ALL
SELECT 'manager_confirmations' as table_name, COUNT(*) as record_count FROM manager_confirmations
UNION ALL
SELECT 'optimization_groups' as table_name, COUNT(*) as record_count FROM optimization_groups
UNION ALL
SELECT 'azure_ad_users_cache' as table_name, COUNT(*) as record_count FROM azure_ad_users_cache;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- CLEAR DATA IN CORRECT ORDER
-- ============================================

SELECT '=== CLEARING DATA ===' AS '';

-- 1. Clear child tables first (referencing trips)
DELETE FROM join_requests;
SELECT 'Cleared: join_requests' AS status;

DELETE FROM approval_audit_log;
SELECT 'Cleared: approval_audit_log' AS status;

DELETE FROM admin_override_log;
SELECT 'Cleared: admin_override_log' AS status;

-- 2. Clear manager confirmations
DELETE FROM manager_confirmations;
SELECT 'Cleared: manager_confirmations' AS status;

-- 3. Clear optimization groups
DELETE FROM optimization_groups;
SELECT 'Cleared: optimization_groups' AS status;

-- 4. Clear trips table
DELETE FROM trips;
SELECT 'Cleared: trips' AS status;

-- 5. Clear users table
-- Option 1: Clear ALL users (including admins)
DELETE FROM users;
SELECT 'Cleared: users (all)' AS status;

-- Option 2: Clear only regular users, keep admins
-- Uncomment this and comment the above if you want to keep admin accounts
-- DELETE FROM users WHERE role = 'user';
-- SELECT 'Cleared: users (kept admins)' AS status;

-- 6. Optional: Clear Azure AD cache
DELETE FROM azure_ad_users_cache;
SELECT 'Cleared: azure_ad_users_cache' AS status;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '=== AFTER RESET ===' AS '';

SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'trips' as table_name, COUNT(*) as record_count FROM trips
UNION ALL
SELECT 'join_requests' as table_name, COUNT(*) as record_count FROM join_requests
UNION ALL
SELECT 'approval_audit_log' as table_name, COUNT(*) as record_count FROM approval_audit_log
UNION ALL
SELECT 'admin_override_log' as table_name, COUNT(*) as record_count FROM admin_override_log
UNION ALL
SELECT 'manager_confirmations' as table_name, COUNT(*) as record_count FROM manager_confirmations
UNION ALL
SELECT 'optimization_groups' as table_name, COUNT(*) as record_count FROM optimization_groups
UNION ALL
SELECT 'azure_ad_users_cache' as table_name, COUNT(*) as record_count FROM azure_ad_users_cache;

-- ============================================
-- PRESERVED DATA (should still exist)
-- ============================================

SELECT '=== PRESERVED CONFIGURATION DATA ===' AS '';

-- Check locations (should not be empty)
SELECT 'locations' as table_name, COUNT(*) as record_count FROM locations;

-- Check vehicles (should preserve if any)
SELECT 'vehicles' as table_name, COUNT(*) as record_count FROM vehicles;

-- Check admin_audit_log (if exists)
SELECT COUNT(*) as admin_audit_log_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name = 'admin_audit_log';

-- Check pending_admin_assignments (if exists)
SELECT COUNT(*) as pending_admin_assignments_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name = 'pending_admin_assignments';

-- Check temp_trips (if exists)
SELECT COUNT(*) as temp_trips_count
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name = 'temp_trips';

SELECT '========================================' AS '';
SELECT '✅ DATABASE RESET COMPLETED' AS final_status;
SELECT 'Database is now clean for testing' AS message;
SELECT '========================================' AS '';
