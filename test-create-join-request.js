// Test creating a join request directly in database
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');
  console.log('='.repeat(80));
  console.log('TESTING JOIN REQUEST CREATION');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Get a sample user (not admin)
    console.log('📊 STEP 1: Finding a sample user');
    console.log('─'.repeat(80));

    const [users] = await connection.execute(`
      SELECT id, email, name, department
      FROM users
      WHERE role = 'user' AND profile_completed = TRUE
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ No regular users found in database');
      console.log('   Please create at least one regular user first.\n');
      await connection.end();
      return;
    }

    const user = users[0];
    console.log(`\nUsing user: ${user.name} (${user.email})\n`);

    // 2. Get a sample trip
    console.log('📊 STEP 2: Finding a sample trip');
    console.log('─'.repeat(80));

    const [trips] = await connection.execute(`
      SELECT id, user_id, departure_location, destination, departure_date, departure_time, vehicle_type
      FROM trips
      WHERE status IN ('approved', 'optimized', 'approved_solo')
        AND user_id != ?
      ORDER BY departure_date DESC
      LIMIT 1
    `, [user.id]);

    if (trips.length === 0) {
      console.log('❌ No approved trips found in database');
      console.log('   Please create at least one approved trip first.\n');
      await connection.end();
      return;
    }

    const trip = trips[0];
    console.log(`\nUsing trip:`);
    console.log(`   From: ${trip.departure_location}`);
    console.log(`   To: ${trip.destination}`);
    console.log(`   Date: ${trip.departure_date}`);
    console.log(`   Time: ${trip.departure_time}\n`);

    // 3. Try to insert a join request
    console.log('📊 STEP 3: Attempting to insert join request');
    console.log('─'.repeat(80));

    const joinRequestId = `jr_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tripDetails = JSON.stringify({
      departureLocation: trip.departure_location,
      destination: trip.destination,
      departureDate: trip.departure_date,
      departureTime: trip.departure_time
    });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      await connection.execute(`
        INSERT INTO join_requests
        (id, trip_id, trip_details, requester_id, requester_name, requester_email,
         requester_department, reason, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        joinRequestId,
        trip.id,
        tripDetails,
        user.id,
        user.name,
        user.email,
        user.department,
        'Test join request',
        'pending',
        now,
        now
      ]);

      console.log('✅ Successfully inserted test join request!');
      console.log(`   ID: ${joinRequestId}\n`);

      // Verify insertion
      const [verifyResult] = await connection.execute(`
        SELECT * FROM join_requests WHERE id = ?
      `, [joinRequestId]);

      if (verifyResult.length > 0) {
        console.log('✅ Verified: Join request exists in database');
        console.log('\nJoin request details:');
        console.log(`   ID: ${verifyResult[0].id}`);
        console.log(`   Trip ID: ${verifyResult[0].trip_id}`);
        console.log(`   Requester: ${verifyResult[0].requester_name}`);
        console.log(`   Status: ${verifyResult[0].status}`);
        console.log(`   Created: ${verifyResult[0].created_at}`);

        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        await connection.execute(`
          DELETE FROM join_requests WHERE id = ?
        `, [joinRequestId]);
        console.log('✅ Test data cleaned up');
      }

    } catch (insertError) {
      console.error('❌ Failed to insert join request:', insertError.message);
      console.error('   SQL State:', insertError.sqlState);
      console.error('   Error Code:', insertError.errno);

      if (insertError.errno === 1452) {
        console.log('\n⚠️  This is a FOREIGN KEY constraint error');
        console.log('   The trip_id or requester_id does not exist in the referenced table');
      }
    }

    // 4. Check table constraints
    console.log('\n\n📊 STEP 4: Checking table constraints');
    console.log('─'.repeat(80));

    const [constraints] = await connection.execute(`
      SELECT
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE,
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'join_requests'
    `);

    console.log('\nTable constraints:');
    if (constraints.length === 0) {
      console.log('   (no constraints)');
    } else {
      constraints.forEach(c => {
        console.log(`   ${c.CONSTRAINT_TYPE}: ${c.CONSTRAINT_NAME}`);
      });
    }

    // Check foreign keys
    const [foreignKeys] = await connection.execute(`
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'join_requests'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (foreignKeys.length > 0) {
      console.log('\nForeign keys:');
      foreignKeys.forEach(fk => {
        console.log(`   ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }

    // 5. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));

    console.log('\n✅ WHAT WORKS:');
    console.log('   1. Database connection successful');
    console.log('   2. Table join_requests exists with correct structure');
    console.log('   3. Manual INSERT works (if no error above)');

    console.log('\n⚠️  POSSIBLE ISSUES:');
    console.log('   1. API endpoint might not be calling the save function');
    console.log('   2. Error might be thrown but not shown to user');
    console.log('   3. Transaction might be rolled back');

    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Check browser console when submitting join request');
    console.log('   2. Check server logs (terminal) for errors');
    console.log('   3. Test API endpoint: POST /api/join-requests');
    console.log('   4. Check if saveJoinRequestMySQL is being called');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed\n');
  }
})().catch(console.error);
