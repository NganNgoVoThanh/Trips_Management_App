#!/usr/bin/env node
// Test join_request INSERT to diagnose why admin page shows nothing

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testJoinRequestInsert() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🔍 Checking foreign key constraints on join_requests...\n');

  // Check constraints
  const [constraints] = await conn.query(`
    SELECT
      CONSTRAINT_NAME,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'join_requests'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `, [process.env.DB_NAME]);

  console.log('📋 Foreign key constraints:');
  if (constraints.length > 0) {
    console.table(constraints);
  } else {
    console.log('No foreign key constraints found');
  }

  // Test with a real trip ID
  console.log('\n🔍 Finding a real trip to test with...');
  const [trips] = await conn.query(`
    SELECT id, user_name, departure_location, destination, status
    FROM trips
    WHERE status IN ('approved', 'optimized', 'approved_solo')
    LIMIT 5
  `);

  if (trips.length > 0) {
    console.log('\n📋 Available trips for testing:');
    console.table(trips);

    const realTripId = trips[0].id;
    console.log(`\n🧪 Testing INSERT with real trip_id: ${realTripId}`);

    const testRequest = {
      id: 'jr_test_' + Date.now(),
      trip_id: realTripId,
      trip_details: JSON.stringify({
        departureLocation: trips[0].departure_location,
        destination: trips[0].destination,
        departureDate: '2026-02-01',
        departureTime: '08:00'
      }),
      requester_id: 'test_user_123',
      requester_name: 'Test User',
      requester_email: 'test@example.com',
      requester_department: 'IT',
      requester_manager_email: 'manager@example.com',
      requester_manager_name: 'Test Manager',
      reason: 'Test join request',
      status: 'pending'
    };

    try {
      await conn.query('INSERT INTO join_requests SET ?', [testRequest]);
      console.log('✅ Test record inserted successfully!\n');

      const [rows] = await conn.query(
        'SELECT id, trip_id, requester_name, status, created_at FROM join_requests WHERE id = ?',
        [testRequest.id]
      );
      console.log('✅ Retrieved from database:');
      console.table(rows);

      // Check all join requests
      const [allRequests] = await conn.query(`
        SELECT id, trip_id, requester_name, status, created_at
        FROM join_requests
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.log('\n📋 All join_requests in database:');
      console.table(allRequests);

      // Cleanup
      await conn.query('DELETE FROM join_requests WHERE id = ?', [testRequest.id]);
      console.log('\n🧹 Test record cleaned up');
    } catch (error) {
      console.error('❌ Insert failed:', error.message);
      console.error('Error code:', error.code);
      console.error('SQL:', error.sql);
    }
  } else {
    console.log('❌ No trips found in database!');
  }

  await conn.end();
}

testJoinRequestInsert().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
