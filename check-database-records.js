const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRecords() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('📊 Current Database Records:\n');

  const tables = [
    'users',
    'trips',
    'join_requests',
    'approval_audit_log',
    'admin_override_log',
    'manager_confirmations',
    'optimization_groups',
    'azure_ad_users_cache'
  ];

  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table.padEnd(25)} : ${rows[0].count} records`);
    } catch (error) {
      console.log(`${table.padEnd(25)} : Table not found`);
    }
  }

  await connection.end();
}

checkRecords().catch(console.error);
