// Add num_passengers column to trips table
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addNumPassengersColumn() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🔧 Adding num_passengers column to trips table...\n');

  try {
    // Check if column already exists
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'trips' AND COLUMN_NAME = 'num_passengers'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('⏭️  Column num_passengers already exists, skipping...');
      await conn.end();
      return;
    }

    // Add num_passengers column
    await conn.query(`
      ALTER TABLE trips
      ADD COLUMN num_passengers INT DEFAULT 1 COMMENT 'Number of passengers for this trip (excluding driver)'
      AFTER vehicle_type
    `);
    console.log('✅ Added num_passengers column');

    // Add index for better query performance
    await conn.query(`
      ALTER TABLE trips
      ADD INDEX idx_num_passengers (num_passengers)
    `);
    console.log('✅ Added index on num_passengers');

    console.log('\n📊 Column details:');
    const [newColumn] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'trips' AND COLUMN_NAME = 'num_passengers'
    `, [process.env.DB_NAME]);
    console.table(newColumn);

    console.log('\n💡 IMPORTANT NOTES:');
    console.log('1. All existing trips will default to 1 passenger');
    console.log('2. Update trip creation forms to collect num_passengers');
    console.log('3. Vehicle capacity calculation:');
    console.log('   - Car 4-seater: 3 passengers (1 driver + 3 passengers)');
    console.log('   - Van 7-seater: 6 passengers (1 driver + 6 passengers)');
    console.log('   - Bus 16-seater: 15 passengers (1 driver + 15 passengers)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

addNumPassengersColumn()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
