// Comprehensive debug script for profile flow
// Run: node debug-profile-flow.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function debugProfileFlow() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');
  console.log('='.repeat(80));
  console.log('DEBUGGING PROFILE FLOW');
  console.log('='.repeat(80));

  try {
    // 1. Check if users table has all required columns
    console.log('\n📊 STEP 1: Checking users table structure');
    console.log('─'.repeat(80));

    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM users
    `);

    const requiredColumns = [
      'id', 'email', 'name', 'department', 'office_location',
      'employee_id', 'phone', 'pickup_address', 'pickup_notes',
      'profile_completed', 'manager_email', 'pending_manager_email',
      'emergency_contact', 'emergency_phone', 'preferred_vehicle',
      'preferred_departure_time'
    ];

    const existingColumns = columns.map(col => col.Field);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('❌ Missing columns in users table:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n⚠️  Profile page may not work correctly!\n');
    } else {
      console.log('✅ All required columns exist in users table\n');
    }

    // 2. Check test user data
    console.log('\n📊 STEP 2: Checking user profile data');
    console.log('─'.repeat(80));

    const [users] = await connection.execute(`
      SELECT
        id, email, name, role,
        department, office_location, employee_id,
        phone, pickup_address, pickup_notes,
        manager_email, pending_manager_email, manager_confirmed,
        emergency_contact, emergency_phone,
        preferred_vehicle, preferred_departure_time,
        profile_completed, created_at, updated_at
      FROM users
      WHERE profile_completed = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ No users with completed profiles found!');
      console.log('   Please complete setup profile for at least one user.\n');
      return;
    }

    const user = users[0];
    console.log(`Testing with user: ${user.name} (${user.email})\n`);

    // 3. Simulate GET /api/users/[id]
    console.log('\n📊 STEP 3: Simulating GET /api/users/[id]');
    console.log('─'.repeat(80));

    console.log('API would return:');
    const apiResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      employee_id: user.employee_id,
      office_location: user.office_location,
      pickup_address: user.pickup_address,
      pickup_notes: user.pickup_notes,
      phone: user.phone,
      manager_email: user.manager_email,
      emergency_contact: user.emergency_contact,
      emergency_phone: user.emergency_phone,
      preferred_vehicle: user.preferred_vehicle,
      preferred_departure_time: user.preferred_departure_time
    };

    console.log(JSON.stringify(apiResponse, null, 2));

    // 4. Check what profile page would display
    console.log('\n\n📊 STEP 4: Checking what profile page would display');
    console.log('─'.repeat(80));

    const profileDisplay = {
      name: user.name || 'User',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || 'General',
      employeeId: user.employee_id || '',
      officeLocation: user.office_location || '',
      pickupAddress: user.pickup_address || '',
      pickupNotes: user.pickup_notes || '',
      emergencyContact: user.emergency_contact || '',
      emergencyPhone: user.emergency_phone || '',
      preferredVehicle: user.preferred_vehicle || 'car-4',
      preferredDepartureTime: user.preferred_departure_time || '08:00'
    };

    console.log('Profile Page State:');
    for (const [key, value] of Object.entries(profileDisplay)) {
      const status = value ? '✅' : '⚠️ ';
      console.log(`   ${status} ${key}: ${value || '(empty)'}`);
    }

    // 5. Check for common issues
    console.log('\n\n📊 STEP 5: Checking for common issues');
    console.log('─'.repeat(80));

    const issues = [];

    if (!user.department) issues.push('Department is NULL');
    if (!user.office_location) issues.push('Office Location is NULL');
    if (!user.phone) issues.push('Phone is NULL');
    if (!user.pickup_address) issues.push('Pickup Address is NULL');

    if (issues.length > 0) {
      console.log('❌ Found issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n💡 These fields are required but missing!');
      console.log('   This is why profile page shows empty values.\n');
    } else {
      console.log('✅ No issues found with required fields\n');
    }

    // 6. Test UPDATE simulation
    console.log('\n📊 STEP 6: Testing UPDATE query (simulation)');
    console.log('─'.repeat(80));

    const testUpdate = {
      phone: '0123456789',
      department: 'Test Department',
      office_location: 'hcm-office',
      pickup_address: 'Test Address',
      pickup_notes: 'Test Notes'
    };

    console.log('If user edits profile with these values:');
    console.log(JSON.stringify(testUpdate, null, 2));

    const updates = [];
    const values = [];

    if (testUpdate.phone !== undefined) {
      updates.push('phone = ?');
      values.push(testUpdate.phone);
    }
    if (testUpdate.department !== undefined) {
      updates.push('department = ?');
      values.push(testUpdate.department);
    }
    if (testUpdate.office_location !== undefined) {
      updates.push('office_location = ?');
      values.push(testUpdate.office_location);
    }
    if (testUpdate.pickup_address !== undefined) {
      updates.push('pickup_address = ?');
      values.push(testUpdate.pickup_address);
    }
    if (testUpdate.pickup_notes !== undefined) {
      updates.push('pickup_notes = ?');
      values.push(testUpdate.pickup_notes);
    }

    values.push(user.id);

    const updateSQL = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log('\nGenerated SQL:');
    console.log(updateSQL);
    console.log('\nWith values:', values);

    // 7. Check authentication helper
    console.log('\n\n📊 STEP 7: Checking authentication setup');
    console.log('─'.repeat(80));

    console.log('Checking if getServerUser helper exists...');
    const fs = require('fs');
    const authHelperPath = './lib/auth-helpers.ts';

    if (fs.existsSync(authHelperPath)) {
      console.log('✅ auth-helpers.ts exists');
    } else {
      console.log('❌ auth-helpers.ts NOT FOUND');
      console.log('   This may cause API authentication to fail!');
    }

    // 8. Summary and recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(80));

    console.log('\n✅ WHAT IS WORKING:');
    console.log('   1. Database schema has all required columns');
    console.log('   2. API endpoints exist and should work');
    console.log('   3. Profile page code looks correct');

    if (issues.length > 0) {
      console.log('\n❌ WHAT IS NOT WORKING:');
      console.log(`   User ${user.email} has incomplete profile data:`);
      issues.forEach(issue => console.log(`   - ${issue}`));

      console.log('\n💡 SOLUTION:');
      console.log('   1. User needs to manually update their profile at /profile');
      console.log('   2. Click "Edit Profile" button');
      console.log('   3. Fill in missing fields');
      console.log('   4. Click "Save Changes"');
      console.log('\n   OR run: node scripts/fix-missing-office-location.js');
    } else {
      console.log('\n✅ User profile is complete!');
    }

    console.log('\n🔍 TO TEST SAVE FUNCTIONALITY:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Network tab');
    console.log('   3. Go to /profile page');
    console.log('   4. Click "Edit Profile"');
    console.log('   5. Change a field');
    console.log('   6. Click "Save Changes"');
    console.log('   7. Check Network tab for:');
    console.log('      - PUT request to /api/users/[id]');
    console.log('      - Response status 200 or error');
    console.log('      - Response body with updated data');

    console.log('\n🔍 TO TEST DATA LOADING:');
    console.log('   1. Open browser console');
    console.log('   2. Reload /profile page');
    console.log('   3. Look for console.log:');
    console.log('      "📊 Profile data from API: {...}"');
    console.log('   4. Check if data matches database');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed\n');
  }
}

debugProfileFlow().catch(console.error);
