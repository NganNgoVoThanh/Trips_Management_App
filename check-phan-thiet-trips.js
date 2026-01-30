const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('\n🔍 Searching for trips: HCM Office → Phan Thiet Factory on 02/05/2026\n');

  // Search ALL trips with this route and date, regardless of status
  const [allTrips] = await conn.query(`
    SELECT
      id,
      user_name,
      user_email,
      departure_location,
      destination,
      departure_date,
      departure_time,
      status,
      data_type,
      optimized_group_id,
      parent_trip_id
    FROM trips
    WHERE departure_location = 'HCM Office'
      AND destination = 'Phan Thiet Factory'
      AND DATE(departure_date) = '2026-02-05'
    ORDER BY departure_time
  `);

  if (allTrips.length === 0) {
    console.log('❌ No trips found with this route and date');
    console.log('\nSearching for ANY trips on 02/05/2026...\n');

    const [anyTrips] = await conn.query(`
      SELECT
        id,
        user_name,
        departure_location,
        destination,
        departure_date,
        departure_time,
        status,
        data_type
      FROM trips
      WHERE DATE(departure_date) = '2026-02-05'
      ORDER BY user_name, departure_time
    `);

    if (anyTrips.length === 0) {
      console.log('❌ No trips found on 02/05/2026 at all');
    } else {
      console.log(`✅ Found ${anyTrips.length} trips on 02/05/2026:\n`);
      anyTrips.forEach((t, i) => {
        console.log(`${i + 1}. ${t.user_name}`);
        console.log(`   ${t.departure_location} → ${t.destination}`);
        console.log(`   Time: ${t.departure_time}, Status: ${t.status}, Type: ${t.data_type}\n`);
      });
    }
  } else {
    console.log(`✅ Found ${allTrips.length} trips:\n`);

    allTrips.forEach((trip, index) => {
      console.log(`${index + 1}. ${trip.user_name} (${trip.user_email})`);
      console.log(`   ID: ${trip.id}`);
      console.log(`   Route: ${trip.departure_location} → ${trip.destination}`);
      console.log(`   Date: ${trip.departure_date}`);
      console.log(`   Time: ${trip.departure_time}`);
      console.log(`   Status: ${trip.status}`);
      console.log(`   Data Type: ${trip.data_type}`);
      console.log(`   Group ID: ${trip.optimized_group_id || 'None'}`);
      console.log(`   Parent Trip ID: ${trip.parent_trip_id || 'None'}`);

      // Check if eligible for optimization
      const isEligible =
        (trip.status === 'approved' || trip.status === 'auto_approved' || trip.status === 'approved_solo') &&
        trip.data_type === 'raw' &&
        !trip.optimized_group_id;

      console.log(`   ✅ Eligible for optimization: ${isEligible ? 'YES' : 'NO'}`);

      if (!isEligible) {
        const reasons = [];
        if (trip.status !== 'approved' && trip.status !== 'auto_approved' && trip.status !== 'approved_solo') {
          reasons.push(`Status is '${trip.status}' (need 'approved', 'auto_approved', or 'approved_solo')`);
        }
        if (trip.data_type !== 'raw') {
          reasons.push(`Data type is '${trip.data_type}' (need 'raw')`);
        }
        if (trip.optimized_group_id) {
          reasons.push(`Already in group ${trip.optimized_group_id}`);
        }
        console.log(`   ❌ Reasons: ${reasons.join(', ')}`);
      }

      console.log('');
    });

    // Count eligible trips
    const eligibleTrips = allTrips.filter(t =>
      (t.status === 'approved' || t.status === 'auto_approved' || t.status === 'approved_solo') &&
      t.data_type === 'raw' &&
      !t.optimized_group_id
    );

    console.log('='.repeat(60));
    console.log(`📊 Summary: ${eligibleTrips.length}/${allTrips.length} trips eligible for optimization`);

    if (eligibleTrips.length >= 2) {
      console.log(`✅ CAN CREATE OPTIMIZATION PROPOSAL for ${eligibleTrips.length} trips!`);
    } else {
      console.log(`❌ Cannot optimize: Need at least 2 eligible trips`);
    }
  }

  await conn.end();
})();
