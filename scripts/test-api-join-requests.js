#!/usr/bin/env node
// Test GET /api/join-requests endpoint

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAPIEndpoint() {
  console.log('🧪 Testing Join Requests API Flow\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Step 1: Check what's in the database
  console.log('📋 Step 1: Check database directly');
  const [dbRequests] = await conn.query(`
    SELECT id, trip_id, requester_name, requester_email, status, created_at
    FROM join_requests
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`Found ${dbRequests.length} join_requests in database:`);
  if (dbRequests.length > 0) {
    console.table(dbRequests);
  } else {
    console.log('❌ Database is EMPTY - no join_requests found!');
    console.log('\n💡 This explains why admin page shows nothing!');
    console.log('👉 Users need to actually submit join requests via UI first.\n');

    // Let's create a test record to verify the API can read it
    console.log('📝 Creating a test join_request to verify API...');

    const [trips] = await conn.query(`
      SELECT id, user_name, departure_location, destination
      FROM trips
      WHERE status IN ('approved', 'optimized', 'approved_solo')
      LIMIT 1
    `);

    if (trips.length === 0) {
      console.log('❌ No trips available for testing');
      await conn.end();
      return;
    }

    const testRequest = {
      id: 'jr_test_api_' + Date.now(),
      trip_id: trips[0].id,
      trip_details: JSON.stringify({
        departureLocation: trips[0].departure_location,
        destination: trips[0].destination,
        departureDate: '2026-02-01',
        departureTime: '08:00'
      }),
      requester_id: 'test_user_123',
      requester_name: 'Test User via Script',
      requester_email: 'test@example.com',
      requester_department: 'IT',
      requester_manager_email: 'manager@example.com',
      requester_manager_name: 'Test Manager',
      reason: 'Test to verify API can read from database',
      status: 'pending'
    };

    await conn.query('INSERT INTO join_requests SET ?', [testRequest]);
    console.log('✅ Test record created with id:', testRequest.id);

    // Check again
    const [updatedRequests] = await conn.query(`
      SELECT id, trip_id, requester_name, status, created_at
      FROM join_requests
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📋 Updated database state:');
    console.table(updatedRequests);
  }

  // Step 2: Check what the service returns
  console.log('\n📋 Step 2: Testing service layer (lib/join-request-service.ts)');
  console.log('Simulating server-side getJoinRequests() call...\n');

  const [serviceRows] = await conn.query(`
    SELECT * FROM join_requests WHERE 1=1 ORDER BY created_at DESC
  `);

  console.log(`Service would return ${serviceRows.length} records`);
  if (serviceRows.length > 0) {
    console.log('Sample record (first one):');
    console.log(JSON.stringify(serviceRows[0], null, 2));
  }

  // Step 3: API endpoint info
  console.log('\n📋 Step 3: API Endpoint Information');
  console.log('Endpoint: GET /api/join-requests');
  console.log('File location: app/api/join-requests/route.ts');
  console.log('Expected behavior:');
  console.log('  1. Extract user from server-side auth');
  console.log('  2. Parse query parameters (tripId, requesterId, status)');
  console.log('  3. Call joinRequestService.getJoinRequests(filters)');
  console.log('  4. Return JSON array of join requests');

  console.log('\n🔍 Next Steps to Debug:');
  console.log('  1. Have a user actually submit a join request via UI');
  console.log('  2. Check browser Network tab for POST /api/join-requests');
  console.log('  3. Check server logs for any errors during INSERT');
  console.log('  4. Verify database has the record after submission');
  console.log('  5. Check admin page loads GET /api/join-requests correctly');

  await conn.end();
}

testAPIEndpoint().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
