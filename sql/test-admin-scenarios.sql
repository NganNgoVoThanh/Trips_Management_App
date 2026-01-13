-- =====================================================
-- TEST SCENARIOS - ADMIN MANAGEMENT SYSTEM
-- =====================================================
-- Use this to test common admin management scenarios
-- =====================================================

-- =====================================================
-- SCENARIO 1: Setup Initial Super Admins
-- =====================================================

SELECT '=== SCENARIO 1: Setup Initial Super Admins ===' as test_scenario;

-- Current super admins (from migration)
SELECT email, name, admin_type FROM users WHERE admin_type = 'super_admin';

-- Add another super admin (IT Manager)
-- Uncomment to execute:
/*
CALL sp_grant_admin_role(
  'it.manager@intersnack.com.vn',
  'super_admin',
  NULL,
  'your-admin-email@intersnack.com.vn',
  'IT Manager - Full system access',
  NULL, NULL
);
*/

-- =====================================================
-- SCENARIO 2: Assign Location Admins to All Factories
-- =====================================================

SELECT '=== SCENARIO 2: Assign Location Admins ===' as test_scenario;

-- Phan Thiết Factory Manager
/*
CALL sp_grant_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'location_admin',
  'loc-phan-thiet',
  'your-admin-email@intersnack.com.vn',
  'Phan Thiết Factory Manager',
  NULL, NULL
);
*/

-- Tây Ninh Factory Manager
/*
CALL sp_grant_admin_role(
  'tran.thi.b@intersnack.com.vn',
  'location_admin',
  'loc-tay-ninh',
  'your-admin-email@intersnack.com.vn',
  'Tây Ninh Factory Manager',
  NULL, NULL
);
*/

-- Long An Factory Manager
/*
CALL sp_grant_admin_role(
  'le.van.c@intersnack.com.vn',
  'location_admin',
  'loc-long-an',
  'your-admin-email@intersnack.com.vn',
  'Long An Factory Manager',
  NULL, NULL
);
*/

-- HCM Office Manager
/*
CALL sp_grant_admin_role(
  'pham.thi.d@intersnack.com.vn',
  'location_admin',
  'loc-ho-chi-minh',
  'your-admin-email@intersnack.com.vn',
  'HCM Office Manager',
  NULL, NULL
);
*/

-- =====================================================
-- SCENARIO 3: Employee Transfer Between Locations
-- =====================================================

SELECT '=== SCENARIO 3: Employee Transfer (PT → TN) ===' as test_scenario;

-- Step 1: Check current location admin
SELECT email, name, admin_type, admin_location_id
FROM users
WHERE email = 'nguyen.van.a@intersnack.com.vn';

-- Step 2: Revoke current location admin
/*
CALL sp_revoke_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'your-admin-email@intersnack.com.vn',
  'Transferred from Phan Thiết to Tây Ninh',
  NULL, NULL
);
*/

-- Step 3: Grant new location admin
/*
CALL sp_grant_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'location_admin',
  'loc-tay-ninh',
  'your-admin-email@intersnack.com.vn',
  'Transferred to Tây Ninh Factory',
  NULL, NULL
);
*/

-- Step 4: Verify change
SELECT email, name, admin_type,
  (SELECT name FROM locations WHERE id = users.admin_location_id) as location
FROM users
WHERE email = 'nguyen.van.a@intersnack.com.vn';

-- =====================================================
-- SCENARIO 4: Promote Location Admin to Super Admin
-- =====================================================

SELECT '=== SCENARIO 4: Promote to Super Admin ===' as test_scenario;

-- Outstanding location admin gets promoted
/*
CALL sp_revoke_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'your-admin-email@intersnack.com.vn',
  'Promotion to Super Admin',
  NULL, NULL
);

CALL sp_grant_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'super_admin',
  NULL,
  'your-admin-email@intersnack.com.vn',
  'Promoted to Super Admin for excellent performance',
  NULL, NULL
);
*/

-- =====================================================
-- SCENARIO 5: Employee Resignation
-- =====================================================

SELECT '=== SCENARIO 5: Employee Resignation ===' as test_scenario;

-- Admin nghỉ việc
/*
CALL sp_revoke_admin_role(
  'nguyen.van.a@intersnack.com.vn',
  'your-admin-email@intersnack.com.vn',
  'Employee resigned',
  NULL, NULL
);
*/

-- Verify revocation
SELECT email, name, role, admin_type FROM users
WHERE email = 'nguyen.van.a@intersnack.com.vn';
-- Expected: role = 'user', admin_type = 'none'

-- =====================================================
-- SCENARIO 6: Temporary Admin Assignment
-- =====================================================

SELECT '=== SCENARIO 6: Temporary Admin (3 months) ===' as test_scenario;

-- Assign temporary admin while permanent admin is on leave
/*
CALL sp_grant_admin_role(
  'temp.user@intersnack.com.vn',
  'location_admin',
  'loc-phan-thiet',
  'your-admin-email@intersnack.com.vn',
  'Temporary admin while Nguyen Van A is on maternity leave (3 months)',
  NULL, NULL
);
*/

-- After 3 months, revoke
/*
CALL sp_revoke_admin_role(
  'temp.user@intersnack.com.vn',
  'your-admin-email@intersnack.com.vn',
  'Temporary assignment ended',
  NULL, NULL
);
*/

-- =====================================================
-- SCENARIO 7: Multiple Admins per Location
-- =====================================================

SELECT '=== SCENARIO 7: Multiple Admins for One Location ===' as test_scenario;

-- Large factory might need 2 admins
/*
CALL sp_grant_admin_role(
  'deputy.manager@intersnack.com.vn',
  'location_admin',
  'loc-phan-thiet',
  'your-admin-email@intersnack.com.vn',
  'Deputy Factory Manager - Additional admin for PT',
  NULL, NULL
);
*/

-- Check all PT admins
SELECT email, name, admin_type,
  (SELECT name FROM locations WHERE id = users.admin_location_id) as location
FROM users
WHERE admin_location_id = 'loc-phan-thiet'
  AND admin_type = 'location_admin';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '=== FINAL VERIFICATION ===' as test_scenario;

-- All admins
SELECT '--- All Admins ---' as section;
SELECT * FROM v_active_admins;

-- Statistics
SELECT '--- Statistics ---' as section;
SELECT * FROM v_admin_statistics;

-- Distribution by location
SELECT '--- Admins per Location ---' as section;
SELECT
  COALESCE(l.name, 'All Locations (Super Admin)') as location,
  COUNT(u.id) as admin_count,
  GROUP_CONCAT(u.email SEPARATOR ', ') as admins
FROM users u
LEFT JOIN locations l ON u.admin_location_id = l.id
WHERE u.admin_type IN ('super_admin', 'location_admin')
GROUP BY l.id, l.name
ORDER BY
  CASE WHEN l.id IS NULL THEN 0 ELSE 1 END,
  l.name;

-- Recent audit log
SELECT '--- Recent Admin Changes ---' as section;
SELECT
  action_type,
  target_user_email,
  CONCAT(previous_admin_type, ' → ', new_admin_type) as change,
  COALESCE((SELECT name FROM locations WHERE id = new_location_id), 'All') as new_location,
  performed_by_email,
  reason,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as when_changed
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- PERMISSION CHECKS (For Testing)
-- =====================================================

SELECT '=== PERMISSION CHECKS ===' as test_scenario;

-- Can this user manage trips in Phan Thiết?
-- Replace email with test user
SET @test_email = 'nguyen.van.a@intersnack.com.vn';
SET @test_location = 'loc-phan-thiet';

SELECT
  @test_email as user,
  @test_location as checking_location,
  CASE
    WHEN admin_type = 'super_admin' THEN 'YES - Super Admin (all locations)'
    WHEN admin_type = 'location_admin' AND admin_location_id = @test_location THEN 'YES - Location Admin for this location'
    WHEN admin_type = 'location_admin' AND admin_location_id != @test_location THEN 'NO - Location Admin for different location'
    ELSE 'NO - Not an admin'
  END as can_manage,
  admin_type,
  (SELECT name FROM locations WHERE id = users.admin_location_id) as assigned_location
FROM users
WHERE email = @test_email;

-- =====================================================
-- END OF TEST SCENARIOS
-- =====================================================
