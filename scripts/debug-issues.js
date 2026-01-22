#!/usr/bin/env node
/**
 * Debug Issues Script
 *
 * Issue 1: Why managers are not receiving approval emails?
 * Issue 2: Why super admin is not redirected to full dashboard?
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function debugIssues() {
  console.log('\n========================================');
  console.log('   DEBUG ISSUES REPORT');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('✅ Connected to database\n');

  // ========================================
  // ISSUE 1: Manager Email Approval
  // ========================================
  console.log('========================================');
  console.log('ISSUE 1: Manager Approval Emails');
  console.log('========================================\n');

  // Check users with manager_email
  const [usersWithManagers] = await connection.query(`
    SELECT
      id,
      email,
      name,
      manager_email,
      manager_name,
      manager_confirmed,
      profile_completed
    FROM users
    WHERE manager_email IS NOT NULL
  `);

  console.log(`📊 Users with manager_email configured: ${usersWithManagers.length}\n`);

  if (usersWithManagers.length > 0) {
    console.log('Users with manager info:');
    usersWithManagers.forEach(u => {
      console.log(`  • ${u.name} (${u.email})`);
      console.log(`    Manager: ${u.manager_name || 'N/A'} (${u.manager_email})`);
      console.log(`    Confirmed: ${u.manager_confirmed ? 'Yes' : 'No'}`);
      console.log(`    Profile Complete: ${u.profile_completed ? 'Yes' : 'No'}\n`);
    });
  } else {
    console.log('⚠️  NO USERS have manager_email configured!');
    console.log('This is why managers are not receiving emails.\n');
  }

  // Check trips that should have triggered manager approval
  const [tripsNeedingApproval] = await connection.query(`
    SELECT
      t.id,
      t.user_email,
      t.user_name,
      t.status,
      t.manager_approval_status,
      t.manager_email,
      t.parent_trip_id,
      t.created_at
    FROM trips t
    WHERE t.manager_approval_status = 'pending'
       OR (t.status IN ('pending_approval', 'pending_urgent')
           AND t.parent_trip_id IS NOT NULL)
    ORDER BY t.created_at DESC
    LIMIT 10
  `);

  console.log(`📊 Trips pending manager approval: ${tripsNeedingApproval.length}\n`);

  if (tripsNeedingApproval.length > 0) {
    console.log('Recent trips pending manager approval:');
    tripsNeedingApproval.forEach(t => {
      console.log(`  • Trip ${t.id.substring(0, 8)}... by ${t.user_name}`);
      console.log(`    Status: ${t.status}`);
      console.log(`    Manager Approval: ${t.manager_approval_status}`);
      console.log(`    Manager Email: ${t.manager_email || 'NOT SET ⚠️'}`);
      console.log(`    Parent Trip: ${t.parent_trip_id ? 'Yes (joined trip)' : 'No'}`);
      console.log(`    Created: ${t.created_at}\n`);
    });
  } else {
    console.log('✅ No trips currently pending manager approval\n');
  }

  // Check Microsoft Graph email configuration
  console.log('📧 Email Service Configuration:');
  console.log(`  GRAPH_CLIENT_ID: ${process.env.GRAPH_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`  GRAPH_CLIENT_SECRET: ${process.env.GRAPH_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log(`  GRAPH_TENANT_ID: ${process.env.AZURE_AD_TENANT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`  EMAIL_NO_REPLY: ${process.env.EMAIL_NO_REPLY || 'Not set'}`);
  console.log(`  EMAIL_APPROVALS: ${process.env.EMAIL_APPROVALS || 'Not set'}\n`);

  // ========================================
  // ISSUE 2: Super Admin Dashboard Redirect
  // ========================================
  console.log('========================================');
  console.log('ISSUE 2: Super Admin Dashboard Redirect');
  console.log('========================================\n');

  // Check ngan.ngo user
  const [nganUser] = await connection.query(`
    SELECT
      id,
      email,
      name,
      role,
      admin_type,
      admin_location_id,
      profile_completed,
      created_at
    FROM users
    WHERE email = 'ngan.ngo@intersnack.com.vn'
    LIMIT 1
  `);

  if (nganUser.length > 0) {
    const user = nganUser[0];
    console.log('✅ Super Admin User Found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Admin Type: ${user.admin_type || 'NOT SET ⚠️'}`);
    console.log(`  Location ID: ${user.admin_location_id || 'N/A'}`);
    console.log(`  Profile Complete: ${user.profile_completed ? 'Yes' : 'No'}`);
    console.log(`  Created: ${user.created_at}\n`);

    // Diagnose redirect issue
    console.log('🔍 Redirect Diagnosis:');
    if (user.role !== 'admin') {
      console.log(`  ❌ PROBLEM: role = '${user.role}' (should be 'admin')`);
      console.log(`  → User will be redirected to /dashboard instead of /admin/dashboard\n`);
    } else {
      console.log(`  ✅ Role is correct: 'admin'\n`);
    }

    if (!user.admin_type || user.admin_type === 'admin') {
      console.log(`  ⚠️  WARNING: admin_type = '${user.admin_type || 'NULL'}'`);
      console.log(`  → Should be 'super_admin' for full super admin privileges\n`);
    } else if (user.admin_type === 'super_admin') {
      console.log(`  ✅ Admin Type is correct: 'super_admin'\n`);
    }

    if (!user.profile_completed) {
      console.log(`  ⚠️  Profile not completed`);
      console.log(`  → User will be redirected to /profile/setup first\n`);
    }

  } else {
    console.log('❌ Super Admin User NOT FOUND in database!');
    console.log('Expected: ngan.ngo@intersnack.com.vn');
    console.log('Action: User needs to login via SSO first to create the user record\n');
  }

  // Check all admin users
  const [allAdmins] = await connection.query(`
    SELECT
      email,
      name,
      role,
      admin_type,
      admin_location_id,
      profile_completed
    FROM users
    WHERE role = 'admin'
    ORDER BY
      CASE admin_type
        WHEN 'super_admin' THEN 1
        WHEN 'location_admin' THEN 2
        WHEN 'admin' THEN 3
        ELSE 4
      END,
      email
  `);

  console.log(`📊 Total Admin Users: ${allAdmins.length}\n`);

  if (allAdmins.length > 0) {
    console.log('All Admin Users:');
    allAdmins.forEach(a => {
      const typeDisplay = a.admin_type || 'not set';
      const locationDisplay = a.admin_location_id ? ` (${a.admin_location_id})` : '';
      const profileStatus = a.profile_completed ? '✅' : '⚠️';
      console.log(`  ${profileStatus} ${a.email}`);
      console.log(`     Role: ${a.role} | Admin Type: ${typeDisplay}${locationDisplay}`);
    });
    console.log();
  } else {
    console.log('⚠️  NO ADMIN USERS found in database!\n');
  }

  // Check redirect logic in app/page.tsx
  console.log('🔍 Redirect Logic Analysis:');
  console.log('  File: app/page.tsx line 31');
  console.log('  Logic: session.user.role === "admin" ? "/admin/dashboard" : "/dashboard"');
  console.log('  ');
  console.log('  ✅ Correct: Uses role field for redirect decision');
  console.log('  ✅ Correct: admin → /admin/dashboard, user → /dashboard');
  console.log('  ');
  console.log('  Note: adminType field is used for authorization WITHIN admin pages,');
  console.log('        not for initial redirect decision\n');

  // ========================================
  // RECOMMENDATIONS
  // ========================================
  console.log('========================================');
  console.log('RECOMMENDATIONS');
  console.log('========================================\n');

  console.log('ISSUE 1: Manager Approval Emails');
  if (usersWithManagers.length === 0) {
    console.log('  ❌ CRITICAL: No users have manager_email configured');
    console.log('  ');
    console.log('  Actions needed:');
    console.log('  1. Users need to complete their profile setup');
    console.log('  2. In profile setup, users must provide their manager\'s email');
    console.log('  3. Manager must confirm via email link');
    console.log('  ');
    console.log('  Without manager_email, the system cannot send approval emails!\n');
  } else {
    console.log('  ✅ Some users have manager_email configured');
    console.log('  ');
    console.log('  Next steps:');
    console.log('  1. Check if emails are being sent (check Microsoft Graph logs)');
    console.log('  2. Verify manager email addresses are correct');
    console.log('  3. Check spam/junk folders');
    console.log('  4. Ensure Microsoft Graph API has Mail.Send permission\n');
  }

  console.log('ISSUE 2: Super Admin Dashboard');
  if (nganUser.length === 0) {
    console.log('  ❌ User needs to login first via SSO to create database record\n');
  } else if (nganUser[0].role !== 'admin') {
    console.log('  ❌ CRITICAL: User role is not "admin"');
    console.log('  ');
    console.log('  Fix: Run SQL command:');
    console.log('  UPDATE users SET role = \'admin\', admin_type = \'super_admin\'');
    console.log('  WHERE email = \'ngan.ngo@intersnack.com.vn\';\n');
  } else if (!nganUser[0].profile_completed) {
    console.log('  ⚠️  User needs to complete profile setup first');
    console.log('  User will be redirected to /profile/setup before dashboard\n');
  } else if (!nganUser[0].admin_type || nganUser[0].admin_type !== 'super_admin') {
    console.log('  ⚠️  WARNING: admin_type not set to "super_admin"');
    console.log('  ');
    console.log('  Recommended fix:');
    console.log('  UPDATE users SET admin_type = \'super_admin\'');
    console.log('  WHERE email = \'ngan.ngo@intersnack.com.vn\';\n');
  } else {
    console.log('  ✅ Configuration looks correct!');
    console.log('  ');
    console.log('  If still having issues:');
    console.log('  1. Clear browser cookies/session');
    console.log('  2. Sign out completely');
    console.log('  3. Sign in again via SSO');
    console.log('  4. Check browser console for errors\n');
  }

  await connection.end();
  console.log('========================================\n');
}

debugIssues().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
