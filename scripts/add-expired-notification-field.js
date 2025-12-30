// scripts/add-expired-notification-field.js
// Add expired_notification_sent column to trips table

const mysql = require('mysql2/promise');

async function addExpiredNotificationField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'tripsmgm-rndus2',
    password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
    database: process.env.DB_NAME || 'tripsmgm-mydb002',
  });

  try {
    console.log('🚀 Adding expired_notification_sent column to trips table...\n');

    // Check if column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'trips'
        AND COLUMN_NAME = 'expired_notification_sent'
    `, [process.env.DB_NAME || 'tripsmgm-mydb002']);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE trips
        ADD COLUMN expired_notification_sent BOOLEAN DEFAULT FALSE AFTER status,
        ADD COLUMN expired_notified_at TIMESTAMP NULL AFTER expired_notification_sent
      `);
      console.log('✅ Added expired_notification_sent and expired_notified_at columns');
    } else {
      console.log('⏭️  Columns already exist');
    }

    // Add index for faster queries
    try {
      await connection.query(`
        CREATE INDEX idx_trips_expired_pending
        ON trips(status, expired_notification_sent, created_at)
      `);
      console.log('✅ Added index for expired pending trips');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  Index already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
addExpiredNotificationField()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
