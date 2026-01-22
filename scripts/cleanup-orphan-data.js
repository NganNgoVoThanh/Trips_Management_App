#!/usr/bin/env node
/**
 * Cleanup orphan optimization data
 * - Remove temp trips that reference non-existent trips
 * - Remove optimization groups that reference non-existent trips
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function cleanupOrphanData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== CLEANING UP ORPHAN OPTIMIZATION DATA ===\n');

  // 1. Get all valid trip IDs
  const [validTrips] = await connection.query('SELECT id FROM trips');
  const validTripIds = new Set(validTrips.map(t => t.id));
  console.log('Valid trips in database:', validTripIds.size);

  // 2. Check optimization groups
  const [groups] = await connection.query(
    'SELECT id, trips, status FROM optimization_groups WHERE status = "proposed"'
  );
  console.log('\nProposed optimization groups:', groups.length);

  const groupsToDelete = [];
  for (const g of groups) {
    const tripIds = JSON.parse(g.trips);
    const allValid = tripIds.every(tid => validTripIds.has(tid));

    if (!allValid) {
      const invalidTrips = tripIds.filter(tid => !validTripIds.has(tid));
      console.log(`\n❌ Group ${g.id} references invalid trips:`);
      console.log('   Invalid trip IDs:', invalidTrips.join(', '));
      groupsToDelete.push(g.id);
    } else {
      console.log(`\n✓ Group ${g.id} - all trips valid`);
    }
  }

  // 3. Delete orphan groups and their temp trips
  if (groupsToDelete.length > 0) {
    console.log(`\n=== DELETING ${groupsToDelete.length} ORPHAN GROUPS ===`);

    for (const groupId of groupsToDelete) {
      // Delete temp trips
      const [tempResult] = await connection.query(
        'DELETE FROM temp_trips WHERE optimized_group_id = ?',
        [groupId]
      );
      console.log(`✓ Deleted ${tempResult.affectedRows} temp trips for group: ${groupId}`);

      // Delete the group
      await connection.query(
        'DELETE FROM optimization_groups WHERE id = ?',
        [groupId]
      );
      console.log(`✓ Deleted group: ${groupId}`);
    }
  }

  // 4. Also clean up any orphan temp trips (parent_trip_id doesn't exist)
  console.log('\n=== CHECKING FOR ORPHAN TEMP TRIPS ===');
  const [tempTrips] = await connection.query('SELECT id, parent_trip_id FROM temp_trips');

  const orphanTempIds = [];
  for (const t of tempTrips) {
    if (t.parent_trip_id && !validTripIds.has(t.parent_trip_id)) {
      orphanTempIds.push(t.id);
    }
  }

  if (orphanTempIds.length > 0) {
    console.log(`Found ${orphanTempIds.length} orphan temp trips`);
    for (const tempId of orphanTempIds) {
      await connection.query('DELETE FROM temp_trips WHERE id = ?', [tempId]);
      console.log(`✓ Deleted orphan temp trip: ${tempId}`);
    }
  } else {
    console.log('No orphan temp trips found');
  }

  // 5. Final verification
  console.log('\n=== FINAL STATE ===');
  const [finalTrips] = await connection.query('SELECT COUNT(*) as count FROM trips');
  const [finalTemps] = await connection.query('SELECT COUNT(*) as count FROM temp_trips');
  const [finalGroups] = await connection.query(
    'SELECT COUNT(*) as count FROM optimization_groups WHERE status = "proposed"'
  );

  console.log('Trips:', finalTrips[0].count);
  console.log('Temp trips:', finalTemps[0].count);
  console.log('Proposed groups:', finalGroups[0].count);

  await connection.end();
  console.log('\n✅ Cleanup complete!');
}

cleanupOrphanData().catch(console.error);
