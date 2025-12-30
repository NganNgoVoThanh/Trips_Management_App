-- =====================================================
-- QUICK SETUP SCRIPT - ADMIN MANAGEMENT SYSTEM
-- =====================================================
-- Run this after admin-management-schema.sql
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY CURRENT SETUP
-- =====================================================

SELECT '=== CURRENT ADMINS ===' as step;
SELECT email, name, role, admin_type, admin_location_id
FROM users
WHERE role = 'admin'
ORDER BY admin_type, email;

SELECT '=== LOCATIONS ===' as step;
SELECT id, code, name, province, active FROM locations;

-- =====================================================
-- STEP 2: EXAMPLE - GRANT SUPER ADMIN
-- =====================================================

-- Template: Grant Super Admin (Full system access)
-- Uncomment and modify email below:

/*
CALL sp_grant_admin_role(
  'your-email@intersnack.com.vn',    -- Replace with actual email
  'super_admin',
  NULL,
  'admin@intersnack.com.vn',          -- Replace with your current admin email
  'Setup initial Super Admin',
  NULL,
  NULL
);
*/

-- =====================================================
-- STEP 3: EXAMPLE - GRANT LOCATION ADMINS
-- =====================================================

-- Template: Grant Location Admin for Phan Thiết
/*
CALL sp_grant_admin_role(
  'pt-manager@intersnack.com.vn',    -- Replace with Phan Thiết manager email
  'location_admin',
  'loc-phan-thiet',
  'admin@intersnack.com.vn',
  'Setup Phan Thiết Factory Manager',
  NULL,
  NULL
);
*/

-- Template: Grant Location Admin for Tây Ninh
/*
CALL sp_grant_admin_role(
  'tn-manager@intersnack.com.vn',    -- Replace with Tây Ninh manager email
  'location_admin',
  'loc-tay-ninh',
  'admin@intersnack.com.vn',
  'Setup Tây Ninh Factory Manager',
  NULL,
  NULL
);
*/

-- Template: Grant Location Admin for Long An
/*
CALL sp_grant_admin_role(
  'la-manager@intersnack.com.vn',    -- Replace with Long An manager email
  'location_admin',
  'loc-long-an',
  'admin@intersnack.com.vn',
  'Setup Long An Factory Manager',
  NULL,
  NULL
);
*/

-- Template: Grant Location Admin for Hồ Chí Minh
/*
CALL sp_grant_admin_role(
  'hcm-manager@intersnack.com.vn',   -- Replace with HCM office manager email
  'location_admin',
  'loc-ho-chi-minh',
  'admin@intersnack.com.vn',
  'Setup Hồ Chí Minh Office Manager',
  NULL,
  NULL
);
*/

-- =====================================================
-- STEP 4: VERIFY SETUP
-- =====================================================

SELECT '=== UPDATED ADMINS ===' as step;
SELECT * FROM v_active_admins;

SELECT '=== ADMIN STATISTICS ===' as step;
SELECT * FROM v_admin_statistics;

SELECT '=== AUDIT LOG ===' as step;
SELECT
  action_type,
  target_user_email,
  previous_admin_type,
  new_admin_type,
  performed_by_email,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- END OF QUICK SETUP
-- =====================================================
