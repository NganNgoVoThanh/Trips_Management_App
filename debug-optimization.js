/**
 * Debug Optimization - Check why optimization is not creating proposals
 *
 * This script will:
 * 1. Show all trips eligible for optimization
 * 2. Group trips by date + route
 * 3. Check savings calculation
 * 4. Identify why proposals are not being created
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DEBUG OPTIMIZATION');
  console.log('='.repeat(60) + '\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Get all trips eligible for optimization
    console.log('📊 Fetching eligible trips...\n');

    const [trips] = await connection.query(`
      SELECT
        id,
        user_name,
        departure_location,
        destination,
        departure_date,
        departure_time,
        status,
        optimized_group_id,
        vehicle_type,
        data_type
      FROM trips
      WHERE status IN ('approved', 'auto_approved')
        AND data_type = 'raw'
      ORDER BY departure_date, departure_location, destination, departure_time
    `);

    if (trips.length === 0) {
      console.log('❌ No trips found with status "approved" or "auto_approved"');
      return;
    }

    console.log(`✅ Found ${trips.length} eligible trips:\n`);

    // Display all trips
    trips.forEach((trip, index) => {
      console.log(`${index + 1}. ${trip.user_name}`);
      console.log(`   ID: ${trip.id}`);
      console.log(`   Route: ${trip.departure_location} → ${trip.destination}`);
      console.log(`   Date: ${trip.departure_date}, Time: ${trip.departure_time}`);
      console.log(`   Status: ${trip.status}`);
      console.log(`   Vehicle: ${trip.vehicle_type || 'N/A'}`);
      console.log(`   GroupId: ${trip.optimized_group_id || 'None'}`);
      console.log('');
    });

    // Group trips by date + route
    console.log('='.repeat(60));
    console.log('📦 GROUPING BY DATE + ROUTE\n');

    const groups = new Map();

    trips.forEach(trip => {
      // Skip trips that already have a group
      if (trip.optimized_group_id) {
        console.log(`⏭️  Skipping ${trip.user_name} - already in group ${trip.optimized_group_id}`);
        return;
      }

      const key = `${trip.departure_date}_${trip.departure_location}_${trip.destination}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(trip);
    });

    console.log(`\n✅ Created ${groups.size} groups:\n`);

    let groupIndex = 1;
    for (const [key, groupTrips] of groups.entries()) {
      const [date, from, to] = key.split('_');

      console.log(`Group ${groupIndex}: ${from} → ${to} on ${date}`);
      console.log(`   Trips: ${groupTrips.length}`);
      console.log(`   Users: ${groupTrips.map(t => t.user_name).join(', ')}`);
      console.log(`   Times: ${groupTrips.map(t => t.departure_time).join(', ')}`);

      // Check if can be optimized
      if (groupTrips.length < 2) {
        console.log(`   ❌ Cannot optimize: Only 1 trip\n`);
      } else {
        // Calculate time differences
        const times = groupTrips.map(t => {
          const [h, m] = t.departure_time.split(':');
          return parseInt(h) * 60 + parseInt(m);
        });

        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const maxDiff = Math.max(...times.map(t => Math.abs(t - avgTime)));

        console.log(`   Average time: ${Math.floor(avgTime/60)}:${(avgTime%60).toString().padStart(2, '0')}`);
        console.log(`   Max time diff: ${maxDiff} minutes`);

        if (maxDiff > 30) {
          console.log(`   ❌ Cannot optimize: Time difference > 30 minutes\n`);
        } else {
          // Calculate vehicle & savings
          let vehicleType = 'car-4';
          if (groupTrips.length > 4 && groupTrips.length <= 7) {
            vehicleType = 'car-7';
          } else if (groupTrips.length > 7 && groupTrips.length <= 16) {
            vehicleType = 'van-16';
          } else if (groupTrips.length > 16) {
            console.log(`   ❌ Cannot optimize: Too many passengers (${groupTrips.length} > 16)\n`);
            groupIndex++;
            continue;
          }

          // Simplified cost calculation (distance * rate)
          // For demo, assume distance = 100km
          const costRates = {
            'car-4': 8000,
            'car-7': 10000,
            'van-16': 15000
          };

          const assumedDistance = 100; // km
          const individualCost = groupTrips.length * (assumedDistance * costRates['car-4']);
          const combinedCost = assumedDistance * costRates[vehicleType];
          const savings = individualCost - combinedCost;
          const savingsPercentage = savings > 0 ? (savings / individualCost) * 100 : 0;

          console.log(`   Proposed vehicle: ${vehicleType}`);
          console.log(`   Individual cost: ${individualCost.toLocaleString()} VND`);
          console.log(`   Combined cost: ${combinedCost.toLocaleString()} VND`);
          console.log(`   Savings: ${savings.toLocaleString()} VND (${savingsPercentage.toFixed(1)}%)`);

          if (savingsPercentage < 15) {
            console.log(`   ❌ Cannot optimize: Savings < 15%\n`);
          } else {
            console.log(`   ✅ CAN BE OPTIMIZED! Should create proposal.\n`);
          }
        }
      }

      groupIndex++;
    }

    console.log('='.repeat(60));
    console.log('💡 ANALYSIS COMPLETE\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
