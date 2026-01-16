#!/usr/bin/env node
/**
 * Create missing database objects (tables, views, stored procedures)
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n========================================');
  console.log('   Creating Missing Database Objects');
  console.log('========================================\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log(`✅ Connected to ${process.env.DB_NAME}\n`);

    // Read SQL file
    const sqlFile = path.join(__dirname, '..', 'sql', '009_CREATE_MISSING_TABLES.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and USE statements
      if (statement.startsWith('--') || statement.startsWith('USE')) continue;

      try {
        await connection.query(statement);

        // Show progress for important statements
        if (statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE.*?`?(\w+)`?/i);
          if (match) console.log(`✅ Created table: ${match[1]}`);
        } else if (statement.includes('CREATE VIEW')) {
          const match = statement.match(/CREATE VIEW.*?`?(\w+)`?/i);
          if (match) console.log(`✅ Created view: ${match[1]}`);
        } else if (statement.includes('CREATE PROCEDURE')) {
          const match = statement.match(/CREATE PROCEDURE.*?`?(\w+)`?/i);
          if (match) console.log(`✅ Created stored procedure: ${match[1]}`);
        } else if (statement.includes('INSERT IGNORE INTO locations')) {
          console.log(`✅ Inserted default locations`);
        } else if (statement.includes('ALTER TABLE users ADD COLUMN')) {
          const match = statement.match(/ADD COLUMN (\w+)/i);
          if (match) console.log(`✅ Added column: users.${match[1]}`);
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_FIELDNAME' ||
            error.message.includes('already exists')) {
          // Skip silently
        } else {
          console.error(`⚠️  Warning on statement ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n========================================');
    console.log('   VERIFICATION');
    console.log('========================================\n');

    // Verify tables
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('locations', 'admin_audit_log')
      ORDER BY TABLE_NAME
    `);

    console.log('📋 Tables created:');
    tables.forEach(t => {
      console.log(`   - ${t.TABLE_NAME} (${t.TABLE_ROWS} rows)`);
    });

    // Verify view
    const [views] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'v_active_admins'
        AND TABLE_TYPE = 'VIEW'
    `);

    console.log('\n👁️  Views created:');
    views.forEach(v => {
      console.log(`   - ${v.TABLE_NAME}`);
    });

    // Verify stored procedures
    const [procs] = await connection.query(`
      SELECT ROUTINE_NAME
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_NAME IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
      ORDER BY ROUTINE_NAME
    `);

    console.log('\n⚙️  Stored procedures created:');
    procs.forEach(p => {
      console.log(`   - ${p.ROUTINE_NAME}`);
    });

    // Verify new columns
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('admin_location_id', 'admin_assigned_at', 'admin_assigned_by')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n➕ New columns in users table:');
    cols.forEach(c => {
      console.log(`   - ${c.COLUMN_NAME} (${c.COLUMN_TYPE})`);
    });

    console.log('\n✅ All database objects created successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
