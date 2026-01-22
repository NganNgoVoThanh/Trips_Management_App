#!/usr/bin/env node
/**
 * Check for status conflicts in the system
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkStatusConflicts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== CHECKING FOR STATUS CONFLICTS ===\n');

  // 1. Check trips with optimizedGroupId
  console.log('1. RAW trips with optimizedGroupId (should stay as approved):');
  const [rawWithGroup] = await connection.query(
    'SELECT id, status, optimized_group_id FROM trips WHERE optimized_group_id IS NOT NULL AND data_type = "raw" LIMIT 10'
  );
  rawWithGroup.forEach(t => {
    const issue = t.status !== 'approved' && t.status !== 'auto_approved';
    console.log('   ', t.id.substring(0, 30), '| Status:', t.status, issue ? '❌ WRONG!' : '✅');
  });

  // 2. Check temp trips status
  console.log('\n2. TEMP trips (should be draft):');
  const [temps] = await connection.query('SELECT id, status FROM temp_trips LIMIT 10');
  temps.forEach(t => {
    const issue = t.status !== 'draft';
    console.log('   ', t.id.substring(0, 30), '| Status:', t.status, issue ? '❌ WRONG!' : '✅');
  });

  // 3. Check for invalid status values
  console.log('\n3. Checking for invalid status in trips table:');
  const validTripsStatuses = ['pending_approval','pending_urgent','auto_approved','approved','approved_solo','optimized','rejected','cancelled','expired'];
  const [allTrips] = await connection.query('SELECT DISTINCT status FROM trips');
  allTrips.forEach(s => {
    const valid = validTripsStatuses.includes(s.status);
    console.log('   ', s.status.padEnd(20), valid ? '✅ Valid' : '❌ INVALID!');
  });

  console.log('\n4. Checking for invalid status in temp_trips table:');
  const validTempStatuses = ['pending','confirmed','optimized','cancelled','draft'];
  const [allTemps] = await connection.query('SELECT DISTINCT status FROM temp_trips');
  allTemps.forEach(s => {
    const valid = validTempStatuses.includes(s.status);
    console.log('   ', s.status.padEnd(20), valid ? '✅ Valid' : '❌ INVALID!');
  });

  // 5. Critical check: trips that should be optimizable
  console.log('\n5. Trips available for optimization:');
  const [eligible] = await connection.query(
    'SELECT COUNT(*) as count FROM trips WHERE status IN ("approved", "auto_approved") AND data_type = "raw" AND optimized_group_id IS NULL'
  );
  console.log('   ', eligible[0].count, 'trips can be optimized');

  // 6. Orphaned temp trips
  console.log('\n6. Checking for orphaned temp trips (group not exist):');
  const [orphans] = await connection.query(
    'SELECT t.id, t.optimized_group_id FROM temp_trips t LEFT JOIN optimization_groups g ON t.optimized_group_id = g.id WHERE g.id IS NULL'
  );
  if (orphans.length > 0) {
    console.log('   ❌ Found', orphans.length, 'orphaned temp trips!');
    orphans.forEach(o => console.log('      ', o.id, '| Group:', o.optimized_group_id));
  } else {
    console.log('   ✅ No orphaned temp trips');
  }

  // 7. Groups without temp trips
  console.log('\n7. Checking for groups without temp trips:');
  const [emptyGroups] = await connection.query(
    'SELECT g.id, g.status FROM optimization_groups g LEFT JOIN temp_trips t ON g.id = t.optimized_group_id WHERE g.status = "proposed" GROUP BY g.id HAVING COUNT(t.id) = 0'
  );
  if (emptyGroups.length > 0) {
    console.log('   ❌ Found', emptyGroups.length, 'groups without temp trips!');
    emptyGroups.forEach(g => console.log('      Group:', g.id, '| Status:', g.status));
  } else {
    console.log('   ✅ All proposed groups have temp trips');
  }

  console.log('\n=== SUMMARY ===');
  const hasIssues = orphans.length > 0 || emptyGroups.length > 0;
  console.log(hasIssues ? '❌ ISSUES FOUND - Need to fix!' : '✅ NO CONFLICTS - All status are correct!');

  await connection.end();
}

checkStatusConflicts().catch(console.error);
