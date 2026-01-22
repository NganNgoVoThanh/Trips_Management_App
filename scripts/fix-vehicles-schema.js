// Script to fix vehicles table schema - remove old columns
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixVehiclesSchema() {
  console.log('🔧 Fixing vehicles table schema...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Check existing columns
    console.log('📋 Checking existing columns...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vehicles'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.log('Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));
    console.log('');

    // Remove old schema columns
    const columnsToRemove = ['name', 'type', 'cost_per_km'];

    for (const columnName of columnsToRemove) {
      const hasColumn = columns.some(c => c.COLUMN_NAME === columnName);

      if (hasColumn) {
        try {
          await connection.query(`ALTER TABLE vehicles DROP COLUMN ${columnName}`);
          console.log(`✅ Removed obsolete column: vehicles.${columnName}`);
        } catch (error) {
          console.log(`❌ Error removing vehicles.${columnName}:`, error.message);
        }
      } else {
        console.log(`⏭️  Column vehicles.${columnName} does not exist, skipping`);
      }
    }

    console.log('\n📋 Final columns:');
    const [finalColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'vehicles'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.table(finalColumns);

    console.log('\n✅ Vehicles schema fix completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fixVehiclesSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
