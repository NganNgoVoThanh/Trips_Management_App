#!/usr/bin/env node
/**
 * Test if optimization proposals can be loaded from database
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testOptimizationDisplay() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== OPTIMIZATION DISPLAY TEST ===\n');

  // Step 1: Get optimization groups with status 'proposed'
  console.log('Step 1: Loading optimization groups (status: proposed)');
  const [groups] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = ?',
    ['proposed']
  );
  console.log(`✓ Found ${groups.length} proposed groups\n`);

  if (groups.length === 0) {
    console.log('❌ NO PROPOSALS FOUND');
    console.log('This is why UI shows "No Proposals"\n');
    await connection.end();
    return;
  }

  // Step 2: For each group, get temp trips
  for (const group of groups) {
    console.log(`\nGroup: ${group.id}`);
    console.log(`  Status: ${group.status}`);
    console.log(`  Savings: ${group.estimated_savings}`);
    console.log(`  Vehicle: ${group.vehicle_type}`);
    console.log(`  Departure Time: ${group.proposed_departure_time}`);

    // Get temp trips for this group
    const [tempTrips] = await connection.query(
      'SELECT * FROM temp_trips WHERE optimized_group_id = ?',
      [group.id]
    );

    console.log(`  Temp Trips: ${tempTrips.length}`);

    if (tempTrips.length === 0) {
      console.log('  ❌ NO TEMP TRIPS - This group will NOT show in UI');
    } else {
      console.log('  ✓ This group SHOULD show in UI with:');
      tempTrips.forEach((trip, i) => {
        console.log(`    ${i+1}. ${trip.user_name} | ${trip.departure_location} → ${trip.destination} at ${trip.departure_time}`);
      });
    }
  }

  console.log('\n=== SUMMARY ===');
  let validGroups = 0;
  for (const group of groups) {
    const [tempTrips] = await connection.query(
      'SELECT COUNT(*) as count FROM temp_trips WHERE optimized_group_id = ?',
      [group.id]
    );
    if (tempTrips[0].count > 0) {
      validGroups++;
    }
  }

  console.log(`Total groups: ${groups.length}`);
  console.log(`Groups with temp trips: ${validGroups}`);
  console.log(`\n${validGroups > 0 ? '✅ UI SHOULD DISPLAY ' + validGroups + ' PROPOSALS' : '❌ UI WILL SHOW "NO PROPOSALS"'}`);

  if (validGroups > 0) {
    console.log('\nIf UI still shows "No Proposals", please:');
    console.log('1. Hard refresh browser (Ctrl+Shift+R or Ctrl+F5)');
    console.log('2. Check browser console for errors');
    console.log('3. Verify Next.js dev server is running');
  }

  await connection.end();
}

testOptimizationDisplay().catch(console.error);
