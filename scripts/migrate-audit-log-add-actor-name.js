#!/usr/bin/env node
/**
 * Migration: Add actor_name column to approval_audit_log table
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('========================================');
  console.log('Migration: Add actor_name to approval_audit_log');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'approval_audit_log'
        AND COLUMN_NAME = 'actor_name'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('✓ Column actor_name already exists in approval_audit_log');
      return;
    }

    // Add the column
    console.log('Adding actor_name column...');
    await connection.query(`
      ALTER TABLE approval_audit_log
      ADD COLUMN actor_name VARCHAR(255) AFTER actor_email
    `);

    console.log('✅ Successfully added actor_name column to approval_audit_log');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }

  console.log('\n========================================');
  console.log('Migration completed!');
  console.log('========================================');
}

migrate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
