#!/usr/bin/env node
/**
 * Check for duplicate optimization groups
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkDuplicates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== CHECKING DUPLICATE OPTIMIZATION GROUPS ===\n');

  // Get all proposed groups
  const [groups] = await connection.query(
    'SELECT * FROM optimization_groups WHERE status = "proposed" ORDER BY created_at DESC'
  );
  console.log('Total proposed groups:', groups.length);

  // Check for duplicates by trips content
  const tripSets = {};
  for (const g of groups) {
    const trips = JSON.parse(g.trips).sort().join(',');
    if (!tripSets[trips]) {
      tripSets[trips] = [];
    }
    tripSets[trips].push({
      id: g.id,
      created: g.created_at,
      time: g.proposed_departure_time,
      savings: g.estimated_savings
    });
  }

  console.log('\n=== DUPLICATE ANALYSIS (by trip IDs) ===');
  let duplicateCount = 0;
  const groupsToDelete = [];

  for (const [trips, groupList] of Object.entries(tripSets)) {
    if (groupList.length > 1) {
      duplicateCount++;
      console.log('\nDuplicate set #' + duplicateCount + ':');
      console.log('  Trips:', trips);
      console.log('  Groups (' + groupList.length + ' duplicates):');

      // Keep the newest one, mark others for deletion
      groupList.sort((a, b) => new Date(b.created) - new Date(a.created));
      groupList.forEach((g, i) => {
        const status = i === 0 ? 'KEEP' : 'DELETE';
        console.log('    -', g.id, '| Created:', g.created, '|', status);
        if (i > 0) groupsToDelete.push(g.id);
      });
    }
  }

  if (duplicateCount === 0) {
    console.log('No duplicates found by trip IDs');
  } else {
    console.log('\n=== CLEANUP NEEDED ===');
    console.log('Groups to delete:', groupsToDelete.length);
    console.log(groupsToDelete);
  }

  // Show summary by route
  console.log('\n=== TEMP TRIPS BY ROUTE ===');
  const [temps] = await connection.query(`
    SELECT t.optimized_group_id, t.user_name, t.departure_location, t.destination,
           DATE_FORMAT(t.departure_date, '%Y-%m-%d') as dep_date,
           g.status as group_status
    FROM temp_trips t
    JOIN optimization_groups g ON t.optimized_group_id = g.id
    WHERE g.status = 'proposed'
    ORDER BY t.departure_location, t.destination, t.departure_date
  `);

  const routeMap = {};
  for (const t of temps) {
    const key = `${t.departure_location} → ${t.destination} | ${t.dep_date}`;
    if (!routeMap[key]) routeMap[key] = { groups: new Set(), users: [] };
    routeMap[key].groups.add(t.optimized_group_id);
    routeMap[key].users.push(t.user_name);
  }

  for (const [route, data] of Object.entries(routeMap)) {
    console.log('\nRoute:', route);
    console.log('  Groups:', data.groups.size);
    console.log('  Users:', [...new Set(data.users)].join(', '));
    if (data.groups.size > 1) {
      console.log('  ⚠️  MULTIPLE GROUPS FOR SAME ROUTE!');
    }
  }

  await connection.end();

  return groupsToDelete;
}

checkDuplicates().catch(console.error);
