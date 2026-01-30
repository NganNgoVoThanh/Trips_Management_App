// Script to simulate Available Trips logic and check for potential issues
// Run: node check-available-trips-logic.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAvailableTripsLogic() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    // Simulate Available Trips component filter logic
    const validStatuses = ['approved', 'auto_approved', 'optimized'];

    // Get all trips that would be shown in Available Trips
    const [allTrips] = await connection.execute(`
      SELECT
        id,
        user_id,
        user_name,
        user_email,
        status,
        optimized_group_id,
        departure_location,
        destination,
        departure_date,
        departure_time,
        vehicle_type,
        created_at
      FROM trips
      WHERE status IN ('approved', 'auto_approved', 'optimized')
        AND departure_date >= CURDATE()
      ORDER BY departure_date, departure_time
    `);

    console.log(`📊 TRIPS SHOWN IN "AVAILABLE TRIPS" (${allTrips.length} trips):\n`);

    // Group by optimized_group_id (simulating component logic)
    const groups = new Map();

    allTrips.forEach(trip => {
      if (trip.optimized_group_id) {
        if (!groups.has(trip.optimized_group_id)) {
          groups.set(trip.optimized_group_id, []);
        }
        groups.get(trip.optimized_group_id).push(trip);
      } else {
        // Individual trips
        groups.set(trip.id, [trip]);
      }
    });

    console.log(`Total groups displayed: ${groups.size}\n`);

    // Check each group
    for (const [groupId, groupTrips] of groups) {
      const baseTrip = groupTrips[0];
      const isOptimizedGroup = baseTrip.optimized_group_id !== null;

      console.log('='.repeat(80));
      if (isOptimizedGroup) {
        console.log(`OPTIMIZED GROUP: ${groupId}`);
      } else {
        console.log(`INDIVIDUAL TRIP: ${groupId}`);
      }
      console.log('='.repeat(80));
      console.log(`Route: ${baseTrip.departure_location} → ${baseTrip.destination}`);
      console.log(`Date: ${baseTrip.departure_date} ${baseTrip.departure_time}`);
      console.log(`Vehicle: ${baseTrip.vehicle_type}\n`);

      // Display what component shows
      const displayedPassengers = groupTrips.length;
      console.log(`👥 DISPLAYED PARTICIPANTS: ${displayedPassengers}`);
      groupTrips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.user_name} (${trip.status})`);
      });

      // Now check if there are OTHER trips in the same group with different status
      if (isOptimizedGroup) {
        const [allGroupTrips] = await connection.execute(`
          SELECT
            id,
            user_name,
            user_email,
            status,
            created_at
          FROM trips
          WHERE optimized_group_id = ?
          ORDER BY created_at
        `, [baseTrip.optimized_group_id]);

        const hiddenTrips = allGroupTrips.filter(t =>
          !validStatuses.includes(t.status)
        );

        if (hiddenTrips.length > 0) {
          console.log(`\n⚠️  HIDDEN PARTICIPANTS (not counted): ${hiddenTrips.length}`);
          hiddenTrips.forEach((trip, index) => {
            console.log(`   ${index + 1}. ${trip.user_name} (${trip.status}) ❌`);
          });

          const actualTotal = allGroupTrips.length;
          console.log(`\n❌ PROBLEM DETECTED:`);
          console.log(`   Component shows: ${displayedPassengers} participant(s)`);
          console.log(`   Actual in DB: ${actualTotal} participant(s)`);
          console.log(`   Missing: ${actualTotal - displayedPassengers} participant(s)\n`);

          console.log(`🐛 ROOT CAUSE:`);
          console.log(`   When users join an APPROVED trip (not yet optimized),`);
          console.log(`   their new trip is created with status 'pending_approval'`);
          console.log(`   (waiting for their manager's approval).`);
          console.log(`   These pending trips are NOT counted in participant display!\n`);
        } else {
          console.log(`\n✅ All participants in this group are counted correctly\n`);
        }

        // Check for approved join requests
        const tripIds = groupTrips.map(t => t.id);
        const placeholders = tripIds.map(() => '?').join(',');
        const [joinRequests] = await connection.execute(`
          SELECT
            jr.id,
            jr.requester_name,
            jr.requester_email,
            jr.status,
            jr.created_at
          FROM join_requests jr
          WHERE jr.trip_id IN (${placeholders})
            AND jr.status = 'approved'
        `, tripIds);

        if (joinRequests.length > 0) {
          console.log(`📋 APPROVED JOIN REQUESTS: ${joinRequests.length}`);
          joinRequests.forEach((jr, index) => {
            console.log(`   ${index + 1}. ${jr.requester_name}`);
          });
          console.log();
        }
      }

      console.log();
    }

    // Check for potential issues with approved (non-optimized) trips
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CHECKING FOR POTENTIAL FUTURE ISSUES');
    console.log('='.repeat(80));

    const [approvedNonOptimized] = await connection.execute(`
      SELECT
        id,
        user_name,
        status,
        departure_location,
        destination,
        departure_date,
        vehicle_type
      FROM trips
      WHERE status IN ('approved', 'approved_solo', 'auto_approved')
        AND optimized_group_id IS NULL
        AND departure_date >= CURDATE()
      LIMIT 10
    `);

    console.log(`\nFound ${approvedNonOptimized.length} approved trips (not yet optimized)`);
    console.log(`These trips can be joined by other users.\n`);

    if (approvedNonOptimized.length > 0) {
      console.log(`⚠️  SCENARIO:`);
      console.log(`   1. User A has an approved trip (no optimization yet)`);
      console.log(`   2. User B requests to join → Admin approves`);
      console.log(`   3. System creates new trip for User B with status 'pending_approval'`);
      console.log(`   4. Component shows only User A (status: approved) ✅`);
      console.log(`   5. Component DOES NOT show User B (status: pending_approval) ❌`);
      console.log(`   6. Available seats count is WRONG!\n`);

      console.log(`✅ RECOMMENDED FIX:`);
      console.log(`   Option 1: Count ALL trips with same optimizedGroupId (including pending)`);
      console.log(`   Option 2: When approving join to approved trip, set new trip status to 'approved' instead of 'pending_approval'`);
      console.log(`   Option 3: Include approved join requests in participant count\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('✅ Database connection closed');
  }
}

checkAvailableTripsLogic().catch(console.error);
