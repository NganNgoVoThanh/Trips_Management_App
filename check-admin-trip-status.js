// Script to check status of trips created by admin
// Run: node check-admin-trip-status.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkAdminTripStatus() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    // Query trips created by admin
    const [trips] = await connection.execute(`
      SELECT
        id,
        user_name,
        user_email,
        status,
        created_by_admin,
        admin_email,
        auto_approved,
        manager_approval_status,
        departure_location,
        destination,
        departure_date,
        departure_time,
        created_at
      FROM trips
      WHERE created_by_admin = 1
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log('📊 TRIPS CREATED BY ADMIN:\n');
    console.log('Total:', trips.length, '\n');

    // Group by status
    const statusGroups = {};
    trips.forEach(trip => {
      if (!statusGroups[trip.status]) {
        statusGroups[trip.status] = [];
      }
      statusGroups[trip.status].push(trip);
    });

    // Display grouped by status
    for (const [status, tripList] of Object.entries(statusGroups)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`STATUS: ${status.toUpperCase()} (${tripList.length} trips)`);
      console.log('='.repeat(80));

      tripList.forEach((trip, index) => {
        const isManualEntry = trip.user_email.includes('@temp.local');
        console.log(`\n${index + 1}. ${trip.user_name}`);
        console.log(`   Email: ${trip.user_email}`);
        console.log(`   Type: ${isManualEntry ? '🔴 Manual Entry (not in DB)' : '🟢 Existing User'}`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Auto-approved: ${trip.auto_approved ? 'Yes' : 'No'}`);
        console.log(`   Manager Approval: ${trip.manager_approval_status || 'N/A'}`);
        console.log(`   Route: ${trip.departure_location} → ${trip.destination}`);
        console.log(`   Departure: ${trip.departure_date} ${trip.departure_time}`);
        console.log(`   Created by: ${trip.admin_email}`);
        console.log(`   Created at: ${trip.created_at}`);
      });
    }

    console.log('\n\n📈 SUMMARY BY STATUS:');
    for (const [status, tripList] of Object.entries(statusGroups)) {
      const manualEntries = tripList.filter(t => t.user_email.includes('@temp.local')).length;
      const existingUsers = tripList.length - manualEntries;
      console.log(`\n${status}:`);
      console.log(`  - Manual entries: ${manualEntries}`);
      console.log(`  - Existing users: ${existingUsers}`);
      console.log(`  - Total: ${tripList.length}`);
    }

    // Check for inconsistencies
    console.log('\n\n🔍 CHECKING FOR STATUS INCONSISTENCIES:\n');

    const manualEntryTrips = trips.filter(t => t.user_email.includes('@temp.local'));
    const wrongStatusManual = manualEntryTrips.filter(t => t.status !== 'auto_approved');

    if (wrongStatusManual.length > 0) {
      console.log('❌ ISSUE FOUND: Manual entry trips with wrong status:');
      wrongStatusManual.forEach(t => {
        console.log(`  - ${t.user_name} (${t.user_email}): status = ${t.status}, expected: auto_approved`);
      });
    } else {
      console.log('✅ All manual entry trips have correct status (auto_approved)');
    }

    // Check existing user trips
    const existingUserTrips = trips.filter(t => !t.user_email.includes('@temp.local'));
    console.log(`\n✅ Existing user trips (${existingUserTrips.length}):`);

    const statusCounts = {};
    existingUserTrips.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  - ${status}: ${count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

checkAdminTripStatus().catch(console.error);
