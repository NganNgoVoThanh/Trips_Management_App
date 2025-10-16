// verify-database.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verifyDatabase() {
  console.log('🔍 PHASE 3: DATABASE VERIFICATION\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('✅ Connected to database\n');
  
  // Test 1: Check for recent trips
  console.log('1️⃣ Recent Trips (Last 10):');
  const [recentTrips] = await connection.query(`
    SELECT 
      id, 
      user_name, 
      user_email,
      departure_location, 
      destination, 
      departure_date, 
      status,
      created_at
    FROM trips 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  if (recentTrips.length === 0) {
    console.log('   ⚠️ No trips found in database!');
  } else {
    console.table(recentTrips);
  }
  
  // Test 2: Check data integrity
  console.log('\n2️⃣ Data Integrity Checks:');
  
  // Check for trips without user info
  const [invalidTrips] = await connection.query(`
    SELECT COUNT(*) as count 
    FROM trips 
    WHERE user_email IS NULL OR user_email = ''
  `);
  
  if (invalidTrips[0].count > 0) {
    console.log(`   ⚠️ Found ${invalidTrips[0].count} trips without user email`);
  } else {
    console.log('   ✅ All trips have valid user information');
  }
  
  // Check for duplicate trips
  const [duplicates] = await connection.query(`
    SELECT 
      user_email, 
      departure_date, 
      departure_time,
      COUNT(*) as count
    FROM trips
    GROUP BY user_email, departure_date, departure_time
    HAVING COUNT(*) > 1
  `);
  
  if (duplicates.length > 0) {
    console.log(`   ⚠️ Found ${duplicates.length} potential duplicate trips`);
    console.table(duplicates);
  } else {
    console.log('   ✅ No duplicate trips found');
  }
  
  // Test 3: Check users
  console.log('\n3️⃣ Users in Database:');
  const [users] = await connection.query(`
    SELECT id, email, name, role, department
    FROM users
    ORDER BY role DESC, created_at
  `);
  console.table(users);
  
  // Test 4: Status distribution
  console.log('\n4️⃣ Trip Status Distribution:');
  const [statusDist] = await connection.query(`
    SELECT 
      status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips), 2) as percentage
    FROM trips
    GROUP BY status
    ORDER BY count DESC
  `);
  console.table(statusDist);
  
  // Test 5: Upcoming trips
  console.log('\n5️⃣ Upcoming Trips (Next 30 Days):');
  const [upcomingTrips] = await connection.query(`
    SELECT 
      user_name,
      departure_location,
      destination,
      departure_date,
      departure_time,
      status
    FROM trips
    WHERE departure_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND status != 'cancelled'
    ORDER BY departure_date, departure_time
  `);
  
  if (upcomingTrips.length === 0) {
    console.log('   ℹ️ No upcoming trips in the next 30 days');
  } else {
    console.table(upcomingTrips);
  }
  
  await connection.end();
  console.log('\n✅ PHASE 3 COMPLETED!\n');
}

verifyDatabase().catch(error => {
  console.error('❌ Verification failed:', error.message);
});