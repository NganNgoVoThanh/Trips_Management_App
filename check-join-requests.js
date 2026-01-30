// Check join requests in database
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');
  console.log('='.repeat(80));
  console.log('CHECKING JOIN REQUESTS');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Check if join_requests table exists
    console.log('📊 STEP 1: Checking if join_requests table exists');
    console.log('─'.repeat(80));

    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'join_requests'
    `);

    if (tables.length === 0) {
      console.log('❌ Table join_requests does NOT exist!');
      console.log('   This is the problem - table needs to be created.\n');
      await connection.end();
      return;
    }

    console.log('✅ Table join_requests exists\n');

    // 2. Check table structure
    console.log('\n📊 STEP 2: Checking table structure');
    console.log('─'.repeat(80));

    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM join_requests
    `);

    console.log('Table columns:');
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.Field} (${col.Type})`);
    });

    // 3. Count join requests by status
    console.log('\n\n📊 STEP 3: Counting join requests by status');
    console.log('─'.repeat(80));

    const [statusCounts] = await connection.execute(`
      SELECT
        status,
        COUNT(*) as count
      FROM join_requests
      GROUP BY status
    `);

    if (statusCounts.length === 0) {
      console.log('⚠️  No join requests found in database');
      console.log('   This means users haven\'t submitted any join requests yet.\n');
    } else {
      console.log('\nJoin requests by status:');
      statusCounts.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`);
      });
    }

    // 4. Get all join requests (latest 10)
    console.log('\n\n📊 STEP 4: Listing latest join requests');
    console.log('─'.repeat(80));

    const [requests] = await connection.execute(`
      SELECT
        id,
        trip_id,
        requester_name,
        requester_email,
        status,
        JSON_EXTRACT(trip_details, '$.departureLocation') as departure_location,
        JSON_EXTRACT(trip_details, '$.destination') as destination,
        JSON_EXTRACT(trip_details, '$.departureDate') as departure_date,
        created_at,
        updated_at
      FROM join_requests
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (requests.length === 0) {
      console.log('\n⚠️  No join requests found in database');
    } else {
      console.log(`\nFound ${requests.length} join request(s):\n`);
      requests.forEach((req, idx) => {
        console.log(`${idx + 1}. ${req.requester_name} (${req.status})`);
        console.log(`   Email: ${req.requester_email}`);
        console.log(`   Trip: ${req.departure_location} → ${req.destination}`);
        console.log(`   Date: ${req.departure_date}`);
        console.log(`   Created: ${req.created_at}`);
        console.log(`   ID: ${req.id}`);
        console.log();
      });
    }

    // 5. Check admin user info
    console.log('\n📊 STEP 5: Checking admin user configuration');
    console.log('─'.repeat(80));

    const [admins] = await connection.execute(`
      SELECT
        id,
        email,
        name,
        role,
        admin_type,
        admin_location_id
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\nFound ${admins.length} admin user(s):\n`);
    admins.forEach((admin, idx) => {
      console.log(`${idx + 1}. ${admin.name} (${admin.email})`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Admin Type: ${admin.admin_type || '(not set)'}`);
      console.log(`   Admin Location ID: ${admin.admin_location_id || '(not set)'}`);
      console.log();
    });

    // 6. Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));

    const [totalCount] = await connection.execute(`
      SELECT COUNT(*) as total FROM join_requests
    `);

    const total = totalCount[0].total;

    console.log(`\nTotal join requests in database: ${total}`);

    if (total === 0) {
      console.log('\n⚠️  ISSUE: No join requests in database');
      console.log('   Possible causes:');
      console.log('   1. Users haven\'t submitted any join requests');
      console.log('   2. Join requests are not being saved to database');
      console.log('   3. Database table was recently cleared');
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Ask a user to submit a join request');
      console.log('   2. Check browser console for errors');
      console.log('   3. Check server logs for errors when saving join request');
    } else {
      console.log('\n✅ Join requests exist in database');
      console.log('\n⚠️  POSSIBLE ISSUE:');
      console.log('   Admin might be a location_admin with location filter');
      console.log('   Check if admin user has admin_location_id set');
      console.log('   Location admin can only see join requests for trips in their location');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed\n');
  }
})().catch(console.error);
