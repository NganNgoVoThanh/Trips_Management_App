// scripts/apply-indexes.js
// Apply performance indexes using Node.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyIndexes() {
  console.log('\n============================================');
  console.log('  TRIPS MANAGEMENT SYSTEM');
  console.log('  Performance Indexes Setup');
  console.log('============================================\n');

  // Check environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ ERROR: Database credentials not found in .env file');
    console.error('Please ensure .env file contains:');
    console.error('  DB_HOST=localhost');
    console.error('  DB_USER=root');
    console.error('  DB_PASSWORD=your_password');
    console.error('  DB_NAME=trips_management');
    process.exit(1);
  }

  let connection;

  try {
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database: ' + process.env.DB_NAME);
    console.log('\n📝 Creating performance indexes...\n');

    // Define indexes to create
    const indexes = [
      // TRIPS TABLE
      {
        table: 'trips',
        name: 'idx_status_departure_date',
        columns: '(status, departure_date)',
        description: 'Status + departure date queries'
      },
      {
        table: 'trips',
        name: 'idx_user_email_status',
        columns: '(user_email, status)',
        description: 'User email + status lookups'
      },
      {
        table: 'trips',
        name: 'idx_departure_dest_date',
        columns: '(departure_location, destination, departure_date)',
        description: 'Location-based searches'
      },
      {
        table: 'trips',
        name: 'idx_optimized_group_status',
        columns: '(optimized_group_id, status)',
        description: 'Optimization group queries'
      },
      {
        table: 'trips',
        name: 'idx_user_status_date',
        columns: '(user_id, status, departure_date)',
        description: 'User dashboard queries'
      },

      // TEMP_TRIPS TABLE
      {
        table: 'temp_trips',
        name: 'idx_optimized_group_status',
        columns: '(optimized_group_id, status)',
        description: 'Optimization group lookups'
      },
      {
        table: 'temp_trips',
        name: 'idx_parent_trip_status',
        columns: '(parent_trip_id, status)',
        description: 'Parent trip lookups'
      },

      // JOIN_REQUESTS TABLE
      {
        table: 'join_requests',
        name: 'idx_requester_status',
        columns: '(requester_id, status)',
        description: 'Requester + status lookups'
      },
      {
        table: 'join_requests',
        name: 'idx_trip_status',
        columns: '(trip_id, status)',
        description: 'Trip + status lookups'
      },
      {
        table: 'join_requests',
        name: 'idx_status_created',
        columns: '(status, created_at DESC)',
        description: 'Status + created date sorting'
      },

      // OPTIMIZATION_GROUPS TABLE
      // Note: This table doesn't have departure_date, departure_location, destination
      // It already has index on status (created during table setup)
    ];

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const index of indexes) {
      try {
        // Check if index exists
        const [existing] = await connection.query(
          `SELECT COUNT(*) as count FROM information_schema.STATISTICS
           WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
          [process.env.DB_NAME, index.table, index.name]
        );

        if (existing[0].count > 0) {
          console.log(`⏭️  ${index.table}.${index.name} - Already exists (${index.description})`);
          skipped++;
          continue;
        }

        // Create index
        const sql = `ALTER TABLE ${index.table} ADD INDEX ${index.name} ${index.columns}`;
        await connection.query(sql);
        console.log(`✅ ${index.table}.${index.name} - Created (${index.description})`);
        created++;

      } catch (err) {
        console.error(`❌ ${index.table}.${index.name} - Error: ${err.message}`);
        errors++;
      }
    }

    console.log('\n============================================');
    console.log('  Summary');
    console.log('============================================');
    console.log(`✅ Created: ${created} indexes`);
    console.log(`⏭️  Skipped: ${skipped} indexes (already exist)`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} indexes`);
    }
    console.log('============================================\n');

    if (created > 0 || skipped > 0) {
      console.log('🎉 Performance indexes applied successfully!\n');
      console.log('Next steps:');
      console.log('1. Restart your dev server: npm run dev');
      console.log('2. Test the application');
      console.log('3. Monitor performance improvements\n');
      console.log('See PERFORMANCE_IMPROVEMENTS.md for details\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check your .env file has correct database credentials');
    console.error('- Ensure MySQL server is running');
    console.error('- Verify database "' + process.env.DB_NAME + '" exists');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
applyIndexes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
