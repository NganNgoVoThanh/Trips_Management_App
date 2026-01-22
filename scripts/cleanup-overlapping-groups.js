#!/usr/bin/env node
/**
 * Cleanup overlapping optimization groups
 * If same trips appear in multiple groups, keep only the best one (highest savings)
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function cleanupOverlapping() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== CLEANING UP OVERLAPPING OPTIMIZATION GROUPS ===\n');

  // Get all proposed groups
  const [groups] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = "proposed" ORDER BY estimated_savings DESC'
  );
  console.log('Total proposed groups:', groups.length);

  // Track which trips are already assigned
  const assignedTrips = new Set();
  const groupsToDelete = [];

  for (const g of groups) {
    const tripIds = JSON.parse(g.trips);

    // Check if any trip is already assigned
    const hasOverlap = tripIds.some(tid => assignedTrips.has(tid));

    if (hasOverlap) {
      console.log(`\n❌ Group ${g.id} has overlapping trips - WILL DELETE`);
      console.log(`   Savings: ${g.estimated_savings}`);
      console.log(`   Trips: ${tripIds.join(', ')}`);
      groupsToDelete.push(g.id);
    } else {
      // Mark trips as assigned
      tripIds.forEach(tid => assignedTrips.add(tid));
      console.log(`\n✓ Group ${g.id} - KEEP`);
      console.log(`   Savings: ${g.estimated_savings}`);
      console.log(`   Trips: ${tripIds.join(', ')}`);
    }
  }

  if (groupsToDelete.length === 0) {
    console.log('\n✅ No overlapping groups found. Nothing to clean up.');
    await connection.end();
    return;
  }

  console.log(`\n=== DELETING ${groupsToDelete.length} OVERLAPPING GROUPS ===`);

  for (const groupId of groupsToDelete) {
    // Delete temp trips
    await connection.query(
      'DELETE FROM temp_trips WHERE optimized_group_id = ?',
      [groupId]
    );

    // Remove references from trips
    await connection.query(
      'UPDATE trips SET optimized_group_id = NULL WHERE optimized_group_id = ?',
      [groupId]
    );

    // Delete the group
    await connection.query(
      'DELETE FROM optimization_groups WHERE id = ?',
      [groupId]
    );

    console.log('✓ Deleted group:', groupId);
  }

  // Verify
  const [remaining] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = "proposed"'
  );
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log('Groups remaining:', remaining.length);

  await connection.end();
}

cleanupOverlapping().catch(console.error);
