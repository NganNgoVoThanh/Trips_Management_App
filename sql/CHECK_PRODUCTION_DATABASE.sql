-- ============================================
-- CHECK PRODUCTION DATABASE SCHEMA
-- ============================================
-- Run this on PRODUCTION server to check missing columns/tables

SELECT '=== CHECKING USERS TABLE COLUMNS ===' AS '';

-- Check if admin columns exist
SELECT
  'admin_type' as column_name,
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'admin_type'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001') as status
UNION ALL
SELECT
  'admin_location_id',
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'admin_location_id'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001')
UNION ALL
SELECT
  'admin_assigned_at',
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'admin_assigned_at'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001')
UNION ALL
SELECT
  'admin_assigned_by',
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'admin_assigned_by'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001');

SELECT '=== CHECKING VEHICLES TABLE COLUMNS ===' AS '';

SELECT
  'vehicle_number' as column_name,
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'vehicles'
    AND column_name = 'vehicle_number'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001') as status
UNION ALL
SELECT
  'driver_name',
  IF(EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'vehicles'
    AND column_name = 'driver_name'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001');

SELECT '=== CHECKING REQUIRED TABLES ===' AS '';

SELECT
  'locations' as table_name,
  IF(EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name = 'locations'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001') as status
UNION ALL
SELECT
  'temp_trips',
  IF(EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name = 'temp_trips'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 002')
UNION ALL
SELECT
  'pending_admin_assignments',
  IF(EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name = 'pending_admin_assignments'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001')
UNION ALL
SELECT
  'admin_audit_log',
  IF(EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name = 'admin_audit_log'
  ), '✅ EXISTS', '❌ MISSING - RUN MIGRATION 001');

SELECT '=== CHECKING STORED PROCEDURES ===' AS '';

SELECT
  'sp_grant_admin_role' as procedure_name,
  IF(EXISTS(
    SELECT 1 FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
    AND ROUTINE_NAME = 'sp_grant_admin_role'
  ), '✅ EXISTS', '❌ MISSING - RUN FIX_ALL_ADMIN_ISSUES.sql') as status
UNION ALL
SELECT
  'sp_revoke_admin_role',
  IF(EXISTS(
    SELECT 1 FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
    AND ROUTINE_NAME = 'sp_revoke_admin_role'
  ), '✅ EXISTS', '❌ MISSING - RUN FIX_ALL_ADMIN_ISSUES.sql');

SELECT '=== SUMMARY ===' AS '';

SELECT
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
   AND table_name = 'users'
   AND column_name IN ('admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
  ) as users_admin_columns_count,
  IF(
    (SELECT COUNT(*)
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
     AND table_name = 'users'
     AND column_name IN ('admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
    ) = 4,
    '✅ READY',
    '❌ NEED MIGRATION'
  ) as status;
