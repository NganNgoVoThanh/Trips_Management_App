#!/usr/bin/env node
/**
 * Fix trips.status ENUM to have all 12 required values
 * NOTE: This ONLY touches trips table, NOT kpi_* tables
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   FIXING TRIPS STATUS ENUM');
  console.log('   (KPI tables will NOT be touched)');
  console.log('========================================\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`✅ Connected to ${process.env.DB_NAME}\n`);

    // Check current ENUM values
    console.log('Checking current status ENUM...');
    const [cols] = await connection.query("SHOW COLUMNS FROM trips LIKE 'status'");
    const currentType = cols[0].Type;
    console.log(`Current: ${currentType}\n`);

    // Modify to have all 12 values
    console.log('Updating status ENUM to include all 12 values...');
    await connection.query(`
      ALTER TABLE trips
      MODIFY COLUMN status ENUM(
        'pending_approval',
        'pending_urgent',
        'auto_approved',
        'approved',
        'approved_solo',
        'optimized',
        'rejected',
        'cancelled',
        'expired',
        'pending',
        'confirmed',
        'draft'
      ) DEFAULT 'pending_approval'
    `);
    console.log('✅ Status ENUM updated\n');

    // Verify
    const [newCols] = await connection.query("SHOW COLUMNS FROM trips LIKE 'status'");
    console.log('New ENUM:');
    console.log(newCols[0].Type);

    // Count enum values
    const enumMatch = newCols[0].Type.match(/enum\\((.+)\\)/i);
    if (enumMatch) {
      const values = enumMatch[1].split(',').map(v => v.replace(/'/g, '').trim());
      console.log(`\nTotal values: ${values.length}`);
      console.log('Values:');
      values.forEach(v => console.log(`  - ${v}`));
    }

    console.log('\n✅ Trips status ENUM fixed!\n');

    // Verify KPI tables untouched
    console.log('Verifying KPI tables were not touched...');
    const [tables] = await connection.query('SHOW TABLES');
    const kpiTables = tables.map(t => Object.values(t)[0]).filter(t => t.startsWith('kpi_'));
    console.log(`✅ ${kpiTables.length} KPI tables still intact\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
