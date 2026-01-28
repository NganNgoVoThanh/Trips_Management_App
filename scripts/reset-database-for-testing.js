/**
 * Reset Database for Testing
 *
 * This script:
 * 1. Creates a backup of current data (optional)
 * 2. Clears users and trips data for fresh testing
 * 3. Preserves locations, vehicles, and other configuration data
 *
 * Usage:
 *   node scripts/reset-database-for-testing.js
 *   node scripts/reset-database-for-testing.js --with-backup
 *   node scripts/reset-database-for-testing.js --keep-admin
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const args = process.argv.slice(2);
const WITH_BACKUP = args.includes('--with-backup');
const KEEP_ADMIN = args.includes('--keep-admin');

async function createBackup(connection) {
  console.log('\n📦 Creating backup...\n');

  const backupDir = path.join(__dirname, '../backups');
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  const tables = [
    'users',
    'trips',
    'join_requests',
    'approval_audit_log',
    'admin_override_log',
    'manager_confirmations',
    'optimization_groups',
    'azure_ad_users_cache'
  ];

  let backupSQL = `-- Backup created at ${new Date().toISOString()}\n\n`;

  for (const table of tables) {
    try {
      const [rows] = await connection.query(`SELECT * FROM ${table}`);

      if (rows.length > 0) {
        backupSQL += `-- Table: ${table}\n`;
        backupSQL += `DELETE FROM ${table};\n`;

        // Generate INSERT statements
        for (const row of rows) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'boolean') return v ? '1' : '0';
            return v;
          }).join(', ');

          backupSQL += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        }
        backupSQL += '\n';
      }
    } catch (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
    }
  }

  await fs.writeFile(backupFile, backupSQL);
  console.log(`  ✅ Backup saved to: ${backupFile}\n`);

  return backupFile;
}

async function getRecordCounts(connection) {
  const tables = [
    'users',
    'trips',
    'join_requests',
    'approval_audit_log',
    'admin_override_log',
    'manager_confirmations',
    'optimization_groups',
    'azure_ad_users_cache'
  ];

  const counts = {};

  for (const table of tables) {
    try {
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = rows[0].count;
    } catch (error) {
      counts[table] = 0;
    }
  }

  return counts;
}

async function clearData(connection) {
  console.log('🗑️  Clearing data...\n');

  // Disable foreign key checks temporarily
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    // Clear in correct order (child tables first)
    const clearOrder = [
      'join_requests',
      'approval_audit_log',
      'admin_override_log',
      'manager_confirmations',
      'optimization_groups',
      'trips',
    ];

    for (const table of clearOrder) {
      try {
        const [result] = await connection.query(`DELETE FROM ${table}`);
        console.log(`  ✅ Cleared ${table}: ${result.affectedRows} rows`);
      } catch (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      }
    }

    // Clear users table (keep or remove admins based on flag)
    if (KEEP_ADMIN) {
      const [result] = await connection.query(`DELETE FROM users WHERE role = 'user'`);
      console.log(`  ✅ Cleared users (kept admins): ${result.affectedRows} rows`);
    } else {
      const [result] = await connection.query(`DELETE FROM users`);
      console.log(`  ✅ Cleared users (all): ${result.affectedRows} rows`);
    }

    // Optional: Clear Azure AD cache
    try {
      const [result] = await connection.query(`DELETE FROM azure_ad_users_cache`);
      console.log(`  ✅ Cleared azure_ad_users_cache: ${result.affectedRows} rows`);
    } catch (error) {
      console.log(`  ⚠️  azure_ad_users_cache: ${error.message}`);
    }

  } finally {
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('\n✅ Data clearing completed!\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 RESET DATABASE FOR TESTING');
  console.log('='.repeat(60));
  console.log(`\nOptions:`);
  console.log(`  - Backup: ${WITH_BACKUP ? 'YES' : 'NO'}`);
  console.log(`  - Keep admins: ${KEEP_ADMIN ? 'YES' : 'NO'}`);
  console.log('');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Show current state
    console.log('📊 Current Database State:\n');
    const beforeCounts = await getRecordCounts(connection);
    for (const [table, count] of Object.entries(beforeCounts)) {
      console.log(`  ${table.padEnd(25)} : ${count} records`);
    }

    // Create backup if requested
    if (WITH_BACKUP) {
      await createBackup(connection);
    }

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will DELETE data from your database!');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clear data
    await clearData(connection);

    // Show final state
    console.log('📊 Final Database State:\n');
    const afterCounts = await getRecordCounts(connection);
    for (const [table, count] of Object.entries(afterCounts)) {
      const before = beforeCounts[table];
      const diff = before - count;
      console.log(`  ${table.padEnd(25)} : ${count} records (removed: ${diff})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nYou can now test the application from a clean state.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
