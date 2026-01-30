// Script to check participant count for optimized trips
// Run: node check-participant-count.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkParticipantCount() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    // Get optimized trips
    const [optimizedTrips] = await connection.execute(`
      SELECT
        id,
        user_name,
        user_email,
        status,
        optimized_group_id,
        departure_location,
        destination,
        departure_date,
        departure_time,
        vehicle_type
      FROM trips
      WHERE optimized_group_id IS NOT NULL
      ORDER BY optimized_group_id, created_at
    `);

    console.log('📊 OPTIMIZED TRIPS GROUPING:\n');

    // Group by optimized_group_id
    const groups = {};
    optimizedTrips.forEach(trip => {
      const groupId = trip.optimized_group_id;
      if (!groups[groupId]) {
        groups[groupId] = {
          info: trip,
          allTrips: [],
          validStatusTrips: [],
          pendingTrips: [],
          otherTrips: []
        };
      }
      groups[groupId].allTrips.push(trip);

      // Categorize by status
      if (['approved', 'auto_approved', 'optimized'].includes(trip.status)) {
        groups[groupId].validStatusTrips.push(trip);
      } else if (['pending_approval', 'pending_urgent'].includes(trip.status)) {
        groups[groupId].pendingTrips.push(trip);
      } else {
        groups[groupId].otherTrips.push(trip);
      }
    });

    // Get join requests
    const [joinRequests] = await connection.execute(`
      SELECT
        jr.id,
        jr.trip_id,
        jr.requester_name,
        jr.requester_email,
        jr.status,
        t.optimized_group_id
      FROM join_requests jr
      LEFT JOIN trips t ON jr.trip_id = t.id
      WHERE jr.status = 'approved'
    `);

    console.log(`Total Optimized Groups: ${Object.keys(groups).length}\n`);
    console.log(`Total Approved Join Requests: ${joinRequests.length}\n`);

    // Display each group
    for (const [groupId, data] of Object.entries(groups)) {
      const { info, allTrips, validStatusTrips, pendingTrips, otherTrips } = data;

      console.log('='.repeat(80));
      console.log(`GROUP: ${groupId}`);
      console.log('='.repeat(80));
      console.log(`Route: ${info.departure_location} → ${info.destination}`);
      console.log(`Date: ${info.departure_date} ${info.departure_time}`);
      console.log(`Vehicle: ${info.vehicle_type}\n`);

      console.log(`📊 PARTICIPANT COUNT ANALYSIS:`);
      console.log(`  Total trips in DB: ${allTrips.length}`);
      console.log(`  - Valid status (approved/auto_approved/optimized): ${validStatusTrips.length}`);
      console.log(`  - Pending status (pending_approval/pending_urgent): ${pendingTrips.length}`);
      console.log(`  - Other status: ${otherTrips.length}\n`);

      // Check join requests for this group
      const groupJoinRequests = joinRequests.filter(jr => jr.optimized_group_id === groupId);
      console.log(`  Approved join requests: ${groupJoinRequests.length}\n`);

      // ❌ CURRENT LOGIC (WRONG)
      const currentDisplayCount = validStatusTrips.length;
      console.log(`❌ CURRENT DISPLAY (Available Trips component):`);
      console.log(`   Shows: ${currentDisplayCount} participant(s)\n`);

      // ✅ CORRECT COUNT
      const correctCount = allTrips.length;
      console.log(`✅ CORRECT COUNT:`);
      console.log(`   Should show: ${correctCount} participant(s)\n`);

      // Warning if mismatch
      if (currentDisplayCount !== correctCount) {
        console.log(`⚠️  MISMATCH DETECTED: Display shows ${currentDisplayCount} but actual is ${correctCount}\n`);
      }

      // List participants
      console.log(`👥 PARTICIPANTS:`);
      allTrips.forEach((trip, index) => {
        const statusIcon = validStatusTrips.includes(trip) ? '✅' : '❌';
        console.log(`   ${index + 1}. ${statusIcon} ${trip.user_name} (${trip.user_email})`);
        console.log(`      Status: ${trip.status}`);
      });

      if (groupJoinRequests.length > 0) {
        console.log(`\n📋 JOIN REQUESTS (Approved):`);
        groupJoinRequests.forEach((jr, index) => {
          console.log(`   ${index + 1}. ${jr.requester_name} (${jr.requester_email})`);
        });
      }

      console.log('\n');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));

    let totalMismatches = 0;
    for (const [groupId, data] of Object.entries(groups)) {
      const currentDisplayCount = data.validStatusTrips.length;
      const correctCount = data.allTrips.length;
      if (currentDisplayCount !== correctCount) {
        totalMismatches++;
      }
    }

    if (totalMismatches > 0) {
      console.log(`❌ Found ${totalMismatches} group(s) with incorrect participant count`);
      console.log(`\n🐛 ISSUE: Available Trips component only counts trips with status:`);
      console.log(`   - approved, auto_approved, optimized`);
      console.log(`\n   But when users join approved trips, their new trip has status:`);
      console.log(`   - pending_approval (waiting for their manager to approve)`);
      console.log(`\n   This causes the participant count to be LOWER than actual!\n`);
      console.log(`✅ FIX NEEDED: Count ALL trips in optimized group, not just valid status ones`);
    } else {
      console.log(`✅ All groups have correct participant count`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

checkParticipantCount().catch(console.error);
