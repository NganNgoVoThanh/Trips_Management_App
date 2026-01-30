const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [trips] = await conn.query(`
    SELECT id, user_name, departure_time, departure_location, destination, departure_date
    FROM trips
    WHERE status IN ('approved', 'auto_approved')
      AND data_type = 'raw'
      AND departure_location = 'HCM Office'
      AND destination = 'Long An Factory'
      AND departure_date = '2026-02-10'
  `);

  console.log('Trips for HCM → Long An on Feb 10:\n');
  trips.forEach(t => {
    console.log(`  - ${t.user_name}: departure_time = '${t.departure_time}' (type: ${typeof t.departure_time})`);
    console.log(`    departure_time value: ${JSON.stringify(t.departure_time)}`);
  });

  console.log(`\nTotal: ${trips.length} trips`);

  // Check if all have valid departure_time
  const validTimes = trips.filter(t => t.departure_time && typeof t.departure_time === 'string');
  console.log(`Valid departure times: ${validTimes.length}/${trips.length}`);

  await conn.end();
})();
