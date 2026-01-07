// scripts/add-email-approval-fields.js
// Add email approval workflow fields to trips table

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function addEmailApprovalFields() {
  const connection = await mysql.createConnection({
    host: 'vnicc-lxwb001vh.isrk.local',
    port: 3306,
    user: 'tripsmgm-rndus2',
    password: 'wXKBvt0SRytjvER4e2Hp',
    database: 'tripsmgm-mydb002',
  });

  console.log('📡 Connected to MySQL');

  try {
    console.log('\n📝 Adding email approval fields to trips table...\n');

    // Add new columns
    const alterStatements = [
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT NULL`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_token VARCHAR(500) DEFAULT NULL`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approval_at TIMESTAMP NULL DEFAULT NULL`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS manager_approved_by VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS cc_emails JSON DEFAULT NULL`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT NULL`,
    ];

    for (const sql of alterStatements) {
      try {
        await connection.query(sql);
        console.log('✅', sql.substring(0, 80) + '...');
      } catch (err) {
        if (err.message.includes('Duplicate column name')) {
          console.log('⏭️  Column already exists, skipping...');
        } else {
          throw err;
        }
      }
    }

    // Modify status ENUM
    console.log('\n📝 Updating status ENUM...\n');
    try {
      await connection.query(`
        ALTER TABLE trips
        MODIFY COLUMN status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log('✅ Status ENUM updated');
    } catch (err) {
      console.log('⚠️  Status ENUM may already be updated:', err.message);
    }

    // Add indexes
    console.log('\n📝 Adding indexes...\n');
    const indexStatements = [
      { name: 'idx_manager_approval_status', sql: `ALTER TABLE trips ADD INDEX idx_manager_approval_status (manager_approval_status)` },
      { name: 'idx_is_urgent', sql: `ALTER TABLE trips ADD INDEX idx_is_urgent (is_urgent)` },
      { name: 'idx_auto_approved', sql: `ALTER TABLE trips ADD INDEX idx_auto_approved (auto_approved)` },
    ];

    for (const { name, sql } of indexStatements) {
      try {
        await connection.query(sql);
        console.log(`✅ Index ${name} created`);
      } catch (err) {
        if (err.message.includes('Duplicate key name')) {
          console.log(`⏭️  Index ${name} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Verify columns
    console.log('\n📊 Verifying trips table structure...\n');
    const [columns] = await connection.query(`DESCRIBE trips`);

    const approvalFields = [
      'manager_approval_status',
      'manager_approval_token',
      'manager_approval_at',
      'manager_approved_by',
      'cc_emails',
      'is_urgent',
      'auto_approved',
      'purpose',
    ];

    approvalFields.forEach(field => {
      const found = columns.find(col => col.Field === field);
      if (found) {
        console.log(`✅ ${field}: ${found.Type}`);
      } else {
        console.log(`❌ ${field}: NOT FOUND`);
      }
    });

    console.log('\n✅ Email approval fields migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('📡 MySQL connection closed');
  }
}

addEmailApprovalFields().catch(console.error);
