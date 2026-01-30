/**
 * Check why some users fail to setup profile
 * Compare ngan.ngo (success) vs other users (fail)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 INVESTIGATING PROFILE SETUP FAILURES');
  console.log('='.repeat(60) + '\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // 1. Check ngan.ngo (success case)
    console.log('1️⃣  SUCCESS CASE: ngan.ngo@intersnack.com.vn\n');

    const [nganUser] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      ['ngan.ngo@intersnack.com.vn']
    );

    if (nganUser.length === 0) {
      console.log('❌ ngan.ngo not found in database!');
    } else {
      const user = nganUser[0];
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Azure ID: ${user.azure_id || 'N/A'}`);
      console.log(`   Department: ${user.department || 'N/A'}`);
      console.log(`   Office Location: ${user.office_location || 'N/A'}`);
      console.log(`   Manager Email: ${user.manager_email || 'N/A'}`);
      console.log(`   Pending Manager: ${user.pending_manager_email || 'N/A'}`);
      console.log(`   Profile Completed: ${user.profile_completed ? 'YES' : 'NO'}`);
      console.log(`   Manager Confirmed: ${user.manager_confirmed ? 'YES' : 'NO'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Admin Type: ${user.admin_type || 'N/A'}`);
      console.log(`   Created At: ${user.created_at}`);
    }

    // 2. Check all users in database
    console.log('\n' + '='.repeat(60));
    console.log('2️⃣  ALL USERS IN DATABASE:\n');

    const [allUsers] = await connection.query(`
      SELECT
        email,
        name,
        azure_id,
        profile_completed,
        manager_confirmed,
        role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`Total users: ${allUsers.length}\n`);

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Azure ID: ${user.azure_id || 'N/A'}`);
      console.log(`   Profile Completed: ${user.profile_completed ? 'YES' : 'NO'}`);
      console.log(`   Role: ${user.role || 'user'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // 3. Check Azure AD cache
    console.log('='.repeat(60));
    console.log('3️⃣  AZURE AD USERS CACHE:\n');

    const [azureUsers] = await connection.query(`
      SELECT
        azure_id,
        email,
        display_name,
        department,
        office_location,
        synced_at
      FROM azure_ad_users_cache
      ORDER BY synced_at DESC
      LIMIT 10
    `);

    if (azureUsers.length === 0) {
      console.log('❌ No users in Azure AD cache!');
      console.log('   Users may not have been synced from Azure AD yet.');
    } else {
      console.log(`Total cached: ${azureUsers.length} (showing last 10)\n`);

      azureUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.display_name || 'N/A'}`);
        console.log(`   Azure ID: ${user.azure_id}`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Office: ${user.office_location || 'N/A'}`);
        console.log(`   Synced: ${user.synced_at}`);
        console.log('');
      });
    }

    // 4. Analysis
    console.log('='.repeat(60));
    console.log('4️⃣  ANALYSIS:\n');

    const profileCompletedCount = allUsers.filter(u => u.profile_completed).length;
    const profileIncompleteCount = allUsers.length - profileCompletedCount;

    console.log(`✅ Profile completed: ${profileCompletedCount} users`);
    console.log(`⏳ Profile incomplete: ${profileIncompleteCount} users`);

    if (profileIncompleteCount > 0) {
      console.log('\nUsers with incomplete profiles:');
      allUsers
        .filter(u => !u.profile_completed)
        .forEach(u => {
          console.log(`   - ${u.email}`);
        });
    }

    // 5. Recommendations
    console.log('\n' + '='.repeat(60));
    console.log('5️⃣  RECOMMENDATIONS:\n');

    if (allUsers.length === 1) {
      console.log('⚠️  Only 1 user in database (ngan.ngo)');
      console.log('   Other users are NOT in the database yet.');
      console.log('\n   Possible causes:');
      console.log('   1. Users have not logged in yet (no auto-creation on login)');
      console.log('   2. Azure AD sync has not been run');
      console.log('   3. NextAuth is not creating users on first login');
      console.log('\n   Solutions:');
      console.log('   a) Enable auto-user-creation in NextAuth callbacks');
      console.log('   b) Run Azure AD sync: POST /api/admin/sync-azure');
      console.log('   c) Or manually add users to database');
    } else if (azureUsers.length === 0) {
      console.log('⚠️  Azure AD cache is empty');
      console.log('   Run sync: POST /api/admin/sync-azure');
    } else {
      console.log('✅ Users exist in database');
      console.log('   Error 500 may be due to:');
      console.log('   1. Missing required fields (name, email, etc.)');
      console.log('   2. Database constraint violations');
      console.log('   3. Email validation failures');
      console.log('\n   Check server logs for detailed error messages.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
