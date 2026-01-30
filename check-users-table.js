// Check users table structure
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  const [columns] = await connection.execute('SHOW COLUMNS FROM users');
  console.log('Current users table columns:\n');
  columns.forEach((col, idx) => {
    console.log(`${idx + 1}. ${col.Field} (${col.Type})`);
  });

  await connection.end();
})().catch(console.error);
