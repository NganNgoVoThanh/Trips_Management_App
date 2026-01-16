#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n=== CHECKING DATABASE: ' + process.env.DB_NAME + ' ===\n');

  // Get all tables
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log('Total tables: ' + tableNames.length);
  console.log('\nTrips Management System tables:');

  const tripsRelated = [
    'users', 'trips', 'temp_trips', 'optimization_groups',
    'join_requests', 'vehicles', 'manager_confirmations',
    'approval_audit_log', 'admin_override_log', 'azure_ad_users_cache',
    'allowed_email_domains', 'locations', 'admin_audit_log'
  ];

  let foundCount = 0;
  let missingCount = 0;

  for (const name of tripsRelated) {
    const exists = tableNames.includes(name);
    if (exists) {
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${name}\``);
      console.log('  ✅ ' + name + ' (' + count[0].cnt + ' rows)');
      foundCount++;
    } else {
      console.log('  ❌ ' + name + ' (MISSING)');
      missingCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log('  Found: ' + foundCount + '/' + tripsRelated.length);
  console.log('  Missing: ' + missingCount);

  console.log('\nOther tables in database:');
  const others = tableNames.filter(t => !tripsRelated.includes(t));
  others.forEach(t => console.log('  - ' + t));

  await connection.end();
}

checkTables().catch(console.error);
