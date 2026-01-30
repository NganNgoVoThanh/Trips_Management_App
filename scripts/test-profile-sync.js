// Script to test if profile data syncs correctly from setup to profile page
// Run: node scripts/test-profile-sync.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testProfileSync() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    console.log('=' .repeat(80));
    console.log('TESTING PROFILE SYNC FROM SETUP TO PROFILE PAGE');
    console.log('='.repeat(80));
    console.log();

    // Get all users with completed profiles
    const [users] = await connection.execute(`
      SELECT
        id,
        email,
        name,
        role,
        department,
        employee_id,
        office_location,
        phone,
        pickup_address,
        pickup_notes,
        manager_email,
        pending_manager_email,
        manager_confirmed,
        profile_completed,
        created_at,
        updated_at
      FROM users
      WHERE profile_completed = TRUE
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    console.log(`📊 Found ${users.length} users with completed profiles\n`);

    if (users.length === 0) {
      console.log('⚠️  No users have completed their profile setup yet.');
      console.log('   Please complete profile setup for at least one user first.\n');
      return;
    }

    // Check each user
    users.forEach((user, index) => {
      console.log('─'.repeat(80));
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log('─'.repeat(80));

      // Check required fields from setup
      const setupFields = {
        'Department': user.department,
        'Office Location': user.office_location,
        'Employee ID': user.employee_id,
        'Phone': user.phone,
        'Pickup Address': user.pickup_address,
        'Pickup Notes': user.pickup_notes || '(not provided)',
      };

      console.log('\n📋 Profile Fields (from setup):');
      for (const [field, value] of Object.entries(setupFields)) {
        const status = value ? '✅' : '❌';
        console.log(`   ${status} ${field}: ${value || '(missing)'}`);
      }

      // Check manager setup
      console.log('\n👔 Manager Information:');
      if (user.manager_email) {
        console.log(`   ✅ Manager Email: ${user.manager_email}`);
        console.log(`   ✅ Manager Confirmed: ${user.manager_confirmed ? 'Yes' : 'No'}`);
      } else if (user.pending_manager_email) {
        console.log(`   ⏳ Pending Manager Email: ${user.pending_manager_email}`);
        console.log(`   ⏳ Awaiting Confirmation: Yes`);
      } else {
        console.log(`   ℹ️  No Manager (CEO/C-Level)`);
      }

      // Check profile status
      console.log('\n🔒 Profile Status:');
      console.log(`   Profile Completed: ${user.profile_completed ? '✅ Yes' : '❌ No'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Updated: ${user.updated_at}`);

      // Verify all required fields are present
      const missingFields = [];
      if (!user.department) missingFields.push('department');
      if (!user.office_location) missingFields.push('office_location');
      if (!user.phone) missingFields.push('phone');
      if (!user.pickup_address) missingFields.push('pickup_address');

      if (missingFields.length > 0) {
        console.log('\n❌ ISSUE DETECTED:');
        console.log(`   Missing required fields: ${missingFields.join(', ')}`);
        console.log('   → Profile page may not display correctly!');
      } else {
        console.log('\n✅ All required fields present');
        console.log('   → Profile page should display correctly');
      }

      console.log();
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));

    const usersWithAllFields = users.filter(u =>
      u.department && u.office_location && u.phone && u.pickup_address
    );

    const usersWithMissingFields = users.filter(u =>
      !u.department || !u.office_location || !u.phone || !u.pickup_address
    );

    console.log(`\n✅ Users with complete profile data: ${usersWithAllFields.length}`);
    console.log(`❌ Users with missing fields: ${usersWithMissingFields.length}`);

    if (usersWithMissingFields.length > 0) {
      console.log('\n⚠️  POTENTIAL ISSUES:');
      console.log('   Some users have profile_completed = TRUE but missing required fields.');
      console.log('   This may cause profile page to display incomplete information.\n');
      console.log('   Users with issues:');
      usersWithMissingFields.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
    } else {
      console.log('\n✅ All users have complete profile data!');
      console.log('   Profile page should sync correctly for all users.');
    }

    // Test API structure simulation
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 API RESPONSE SIMULATION');
    console.log('='.repeat(80));

    if (users.length > 0) {
      const sampleUser = users[0];
      console.log('\nGET /api/users/[id] would return:');
      console.log(JSON.stringify({
        id: sampleUser.id,
        email: sampleUser.email,
        name: sampleUser.name,
        role: sampleUser.role,
        department: sampleUser.department,
        employee_id: sampleUser.employee_id,
        office_location: sampleUser.office_location,
        pickup_address: sampleUser.pickup_address,
        pickup_notes: sampleUser.pickup_notes,
        phone: sampleUser.phone,
        manager_email: sampleUser.manager_email,
      }, null, 2));

      console.log('\n✅ This data would be loaded into profile page state:');
      console.log('   - Personal Information tab shows all these fields');
      console.log('   - Fields are pre-filled when user opens the page');
      console.log('   - User can edit and save changes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

testProfileSync().catch(console.error);
