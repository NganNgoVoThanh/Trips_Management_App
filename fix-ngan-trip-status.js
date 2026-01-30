const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('\n🔧 Fixing NGAN trip status from approved_solo → approved\n');

  const tripId = '487768c4-e728-4dc5-b56d-ccf88f844810';

  // Check current status
  const [before] = await conn.query(
    'SELECT id, user_name, status, departure_location, destination FROM trips WHERE id = ?',
    [tripId]
  );

  if (before.length === 0) {
    console.log('❌ Trip not found');
    await conn.end();
    return;
  }

  console.log('Before:');
  console.log(`  User: ${before[0].user_name}`);
  console.log(`  Route: ${before[0].departure_location} → ${before[0].destination}`);
  console.log(`  Status: ${before[0].status}`);

  // Update status
  await conn.query(
    'UPDATE trips SET status = ? WHERE id = ?',
    ['approved', tripId]
  );

  // Check after update
  const [after] = await conn.query(
    'SELECT id, user_name, status FROM trips WHERE id = ?',
    [tripId]
  );

  console.log('\nAfter:');
  console.log(`  Status: ${after[0].status}`);

  console.log('\n✅ Trip status updated successfully!');
  console.log('You can now run optimization again.');

  await conn.end();
})();
