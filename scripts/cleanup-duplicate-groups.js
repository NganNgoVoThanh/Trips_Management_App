#!/usr/bin/env node
/**
 * Cleanup duplicate optimization groups
 * Keep the newest group, delete older duplicates
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function cleanupDuplicates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== CLEANING UP DUPLICATE OPTIMIZATION GROUPS ===\n');

  // Get all proposed groups
  const [groups] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = "proposed" ORDER BY created_at DESC'
  );
  console.log('Total proposed groups before cleanup:', groups.length);

  // Find duplicates by trips content
  const tripSets = {};
  for (const g of groups) {
    const trips = JSON.parse(g.trips).sort().join(',');
    if (!tripSets[trips]) {
      tripSets[trips] = [];
    }
    tripSets[trips].push({
      id: g.id,
      created: g.created_at
    });
  }

  // Identify groups to delete (keep newest, delete older)
  const groupsToDelete = [];
  for (const [trips, groupList] of Object.entries(tripSets)) {
    if (groupList.length > 1) {
      // Sort by created date descending (newest first)
      groupList.sort((a, b) => new Date(b.created) - new Date(a.created));
      // Mark all except the newest for deletion
      for (let i = 1; i < groupList.length; i++) {
        groupsToDelete.push(groupList[i].id);
      }
    }
  }

  if (groupsToDelete.length === 0) {
    console.log('✅ No duplicate groups found. Nothing to clean up.');
    await connection.end();
    return;
  }

  console.log(`Found ${groupsToDelete.length} duplicate groups to delete:`);
  groupsToDelete.forEach(id => console.log('  -', id));

  // Delete temp trips for these groups
  console.log('\n1. Deleting temp trips for duplicate groups...');
  for (const groupId of groupsToDelete) {
    await connection.query(
      'DELETE FROM temp_trips WHERE optimized_group_id = ?',
      [groupId]
    );
    console.log('   ✓ Deleted temp trips for group:', groupId);
  }

  // Remove optimized_group_id from trips that reference deleted groups
  console.log('\n2. Removing group references from trips...');
  for (const groupId of groupsToDelete) {
    await connection.query(
      'UPDATE trips SET optimized_group_id = NULL WHERE optimized_group_id = ?',
      [groupId]
    );
    console.log('   ✓ Removed references for group:', groupId);
  }

  // Delete the duplicate groups
  console.log('\n3. Deleting duplicate optimization groups...');
  for (const groupId of groupsToDelete) {
    await connection.query(
      'DELETE FROM optimization_groups WHERE id = ?',
      [groupId]
    );
    console.log('   ✓ Deleted group:', groupId);
  }

  // Verify cleanup
  const [remaining] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = "proposed"'
  );
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log('Groups remaining:', remaining.length);

  await connection.end();
}

cleanupDuplicates().catch(console.error);
