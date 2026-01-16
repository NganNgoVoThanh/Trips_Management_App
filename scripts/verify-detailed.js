#!/usr/bin/env node
/**
 * Detailed Database Verification Script
 * Checks ALL columns for each table
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

// Complete column requirements for each table
const FULL_TABLE_SCHEMA = {
  users: [
    'id', 'azure_id', 'email', 'employee_id', 'name', 'role',
    'admin_type', 'status', 'department', 'office_location', 'job_title',
    'manager_azure_id', 'manager_email', 'manager_name',
    'manager_confirmed', 'manager_confirmed_at',
    'pending_manager_email', 'manager_change_requested_at',
    'phone', 'pickup_address', 'pickup_notes',
    'profile_completed', 'created_at', 'updated_at', 'last_login_at'
  ],
  trips: [
    'id', 'user_id', 'user_name', 'user_email',
    'departure_location', 'destination',
    'departure_date', 'departure_time', 'return_date', 'return_time',
    'status', 'vehicle_type', 'estimated_cost', 'actual_cost',
    'optimized_group_id', 'original_departure_time',
    'notified', 'data_type', 'parent_trip_id',
    // Email approval workflow
    'purpose', 'cc_emails', 'is_urgent', 'auto_approved', 'auto_approved_reason',
    'manager_email', 'manager_approval_status', 'manager_approval_token',
    'manager_approval_token_expires', 'manager_approval_at', 'manager_approved_by',
    'manager_rejection_reason',
    // Expired notification
    'expired_notification_sent', 'expired_notified_at',
    // Admin creation
    'created_by_admin', 'admin_email', 'notes',
    // Vehicle assignment
    'assigned_vehicle_id', 'vehicle_assignment_notes',
    'vehicle_assigned_by', 'vehicle_assigned_at',
    // Timestamps
    'created_at', 'updated_at'
  ],
  optimization_groups: [
    'id', 'trips', 'proposed_departure_time', 'vehicle_type',
    'estimated_savings', 'status', 'created_by', 'approved_by',
    'created_at', 'approved_at'
  ],
  join_requests: [
    'id', 'trip_id', 'trip_details', 'requester_id',
    'requester_name', 'requester_email', 'requester_department',
    'reason', 'status', 'admin_notes', 'processed_by', 'processed_at',
    'created_at', 'updated_at'
  ],
  vehicles: [
    'id', 'name', 'type', 'capacity', 'cost_per_km',
    'license_plate', 'status', 'notes', 'created_at', 'updated_at'
  ],
  approval_audit_log: [
    'id', 'trip_id', 'action', 'actor_email', 'actor_name', 'actor_role',
    'old_status', 'new_status', 'notes', 'ip_address', 'user_agent', 'created_at'
  ],
  admin_override_log: [
    'id', 'trip_id', 'action_type', 'admin_email', 'admin_name',
    'reason', 'original_status', 'new_status', 'override_reason',
    'user_email', 'user_name', 'manager_email',
    'ip_address', 'user_agent', 'created_at'
  ],
  manager_confirmations: [
    'id', 'user_id', 'user_email', 'user_name',
    'pending_manager_email', 'pending_manager_name',
    'confirmation_token', 'confirmed', 'confirmed_at', 'expires_at', 'created_at'
  ],
  azure_ad_users_cache: [
    'id', 'azure_id', 'email', 'display_name',
    'department', 'office_location', 'job_title', 'phone',
    'is_active', 'last_synced_at', 'created_at'
  ]
};

async function main() {
  console.log('\n========================================');
  console.log('   DETAILED DATABASE VERIFICATION');
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

    let totalMissing = 0;
    const issues = [];

    for (const [tableName, requiredColumns] of Object.entries(FULL_TABLE_SCHEMA)) {
      console.log(`\n📋 ${tableName.toUpperCase()}`);
      console.log('─'.repeat(50));

      // Check if table exists
      const [tables] = await connection.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME, tableName]
      );

      if (tables.length === 0) {
        console.log(`   ❌ TABLE DOES NOT EXIST`);
        issues.push({ table: tableName, type: 'missing_table' });
        continue;
      }

      // Get existing columns
      const [columns] = await connection.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME, tableName]
      );

      const existingCols = columns.map(c => c.COLUMN_NAME || c.column_name);
      const missing = requiredColumns.filter(col => !existingCols.includes(col));
      const extra = existingCols.filter(col => !requiredColumns.includes(col));

      // Get row count
      const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM ${tableName}`);
      const rowCount = countResult[0].cnt;

      console.log(`   Rows: ${rowCount}`);
      console.log(`   Columns: ${existingCols.length} existing, ${requiredColumns.length} expected`);

      if (missing.length > 0) {
        console.log(`   ⚠️  Missing (${missing.length}): ${missing.join(', ')}`);
        totalMissing += missing.length;
        issues.push({ table: tableName, type: 'missing_columns', columns: missing });
      } else {
        console.log(`   ✅ All required columns present`);
      }

      if (extra.length > 0) {
        console.log(`   ℹ️  Extra columns: ${extra.join(', ')}`);
      }
    }

    // Check trips.status ENUM
    console.log('\n\n📋 TRIPS.STATUS ENUM');
    console.log('─'.repeat(50));

    const [enumResult] = await connection.query(`
      SELECT COLUMN_TYPE FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'trips' AND column_name = 'status'
    `, [process.env.DB_NAME]);

    const expectedStatuses = [
      'pending_approval', 'pending_urgent', 'auto_approved',
      'approved', 'approved_solo', 'optimized',
      'rejected', 'cancelled', 'expired'
    ];

    if (enumResult.length > 0) {
      const enumStr = enumResult[0].COLUMN_TYPE;
      const match = enumStr.match(/enum\((.*)\)/i);
      if (match) {
        const currentStatuses = match[1].split(',').map(s => s.replace(/'/g, '').trim());
        const missingStatuses = expectedStatuses.filter(s => !currentStatuses.includes(s));

        console.log(`   Current: ${currentStatuses.length} values`);
        console.log(`   Values: ${currentStatuses.join(', ')}`);

        if (missingStatuses.length > 0) {
          console.log(`   ⚠️  Missing: ${missingStatuses.join(', ')}`);
          issues.push({ table: 'trips', type: 'missing_enum', values: missingStatuses });
        } else {
          console.log(`   ✅ All required status values present`);
        }
      }
    }

    // Final Summary
    console.log('\n\n========================================');
    console.log('   FINAL SUMMARY');
    console.log('========================================\n');

    if (issues.length === 0) {
      console.log('   ✅ DATABASE IS FULLY CONFIGURED!\n');
      console.log('   All tables, columns, and ENUM values are present.');
      console.log('   The application is ready to run.\n');
    } else {
      console.log(`   ⚠️  Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, i) => {
        if (issue.type === 'missing_table') {
          console.log(`   ${i + 1}. Table "${issue.table}" is missing`);
        } else if (issue.type === 'missing_columns') {
          console.log(`   ${i + 1}. Table "${issue.table}" missing columns: ${issue.columns.join(', ')}`);
        } else if (issue.type === 'missing_enum') {
          console.log(`   ${i + 1}. trips.status missing values: ${issue.values.join(', ')}`);
        }
      });

      console.log('\n   To fix: Run node scripts/run-migration.js\n');
    }

    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
