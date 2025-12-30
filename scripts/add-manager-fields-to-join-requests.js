// scripts/add-manager-fields-to-join-requests.js
// Add requester_manager_email and requester_manager_name to join_requests table

const mysql = require('mysql2/promise');

async function addManagerFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  try {
    console.log('🔧 Adding manager fields to join_requests table...');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'join_requests'
        AND COLUMN_NAME IN ('requester_manager_email', 'requester_manager_name')
    `, [process.env.DB_NAME || 'tripsmgm-mydb002']);

    const existingColumns = columns.map((row) => row.COLUMN_NAME);

    // Add requester_manager_email if not exists
    if (!existingColumns.includes('requester_manager_email')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN requester_manager_email VARCHAR(255) DEFAULT NULL
        AFTER requester_department
      `);
      console.log('✅ Added requester_manager_email column');
    } else {
      console.log('⏭️  requester_manager_email column already exists');
    }

    // Add requester_manager_name if not exists
    if (!existingColumns.includes('requester_manager_name')) {
      await connection.query(`
        ALTER TABLE join_requests
        ADD COLUMN requester_manager_name VARCHAR(255) DEFAULT NULL
        AFTER requester_manager_email
      `);
      console.log('✅ Added requester_manager_name column');
    } else {
      console.log('⏭️  requester_manager_name column already exists');
    }

    // Add index for faster lookups
    try {
      await connection.query(`
        CREATE INDEX idx_requester_manager_email
        ON join_requests(requester_manager_email)
      `);
      console.log('✅ Added index on requester_manager_email');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  Index on requester_manager_email already exists');
      } else {
        throw indexError;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew schema:');
    const [schema] = await connection.query('DESCRIBE join_requests');
    console.table(schema);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
addManagerFields()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
