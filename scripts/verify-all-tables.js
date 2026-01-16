// scripts/verify-all-tables.js
// Comprehensive check of all database tables structure

const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyAllTables() {
  console.log('🔍 COMPREHENSIVE DATABASE VERIFICATION\n');
  console.log('=' .repeat(80));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    console.log(`\n📊 Found ${tableNames.length} tables:\n`);
    console.log(tableNames.map(t => `  - ${t}`).join('\n'));
    console.log('\n' + '=' .repeat(80) + '\n');

    // Define expected schema for critical tables
    const expectedSchemas = {
      users: [
        'id', 'azure_id', 'email', 'name', 'employee_id', 'role',
        'admin_type', 'admin_location_id', 'admin_assigned_at', 'admin_assigned_by',
        'department', 'job_title', 'office_location',
        'manager_azure_id', 'manager_email', 'manager_name',
        'manager_confirmed', 'manager_confirmed_at',
        'pending_manager_email', 'manager_change_requested_at',
        'phone', 'pickup_address', 'pickup_notes',
        'profile_completed', 'status',
        'last_login', 'last_login_at', 'created_at', 'updated_at'
      ],
      trips: [
        'id', 'user_id', 'user_email', 'user_name',
        'departure_location', 'destination',
        'departure_date', 'departure_time',
        'return_date', 'return_time',
        'trip_type', 'vehicle_type', 'purpose',
        'estimated_cost', 'actual_cost',
        'status', 'approval_status',
        'approved_by', 'approved_at', 'approved_by_name',
        'rejected_reason', 'cancellation_reason',
        'manager_approved', 'manager_approved_at', 'manager_approved_by',
        'notes', 'created_at', 'updated_at'
      ],
      admins: [
        'id', 'email', 'name', 'admin_type',
        'location_code', 'location_name',
        'assigned_by', 'status', 'notes',
        'created_at', 'updated_at'
      ],
      locations: [
        'id', 'code', 'name', 'type', 'address',
        'coordinates', 'active', 'notes',
        'created_at', 'updated_at'
      ],
      allowed_email_domains: [
        'id', 'domain', 'active', 'notes',
        'created_at', 'updated_at'
      ],
      manager_confirmations: [
        'id', 'user_id', 'manager_email', 'token',
        'type', 'confirmed', 'confirmed_at',
        'expires_at', 'created_at'
      ],
      join_requests: [
        'id', 'email', 'name', 'reason', 'status',
        'reviewed_by', 'reviewed_at', 'rejection_reason',
        'created_at', 'updated_at'
      ],
      admin_override_log: [
        'id', 'trip_id', 'admin_id', 'admin_email',
        'action', 'old_status', 'new_status',
        'reason', 'created_at'
      ]
    };

    const issues = [];
    const recommendations = [];

    // Check each table
    for (const tableName of tableNames) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('-'.repeat(80));

      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      const columnNames = columns.map(col => col.Field);

      console.log(`   Columns (${columnNames.length}):`, columnNames.join(', '));

      // Check against expected schema
      if (expectedSchemas[tableName]) {
        const expected = expectedSchemas[tableName];
        const missing = expected.filter(col => !columnNames.includes(col));
        const extra = columnNames.filter(col => !expected.includes(col));

        if (missing.length > 0) {
          console.log(`   ❌ Missing columns: ${missing.join(', ')}`);
          issues.push({
            table: tableName,
            type: 'missing_columns',
            columns: missing
          });
        }

        if (extra.length > 0) {
          console.log(`   ⚠️  Extra columns (not in expected schema): ${extra.join(', ')}`);
        }

        if (missing.length === 0 && extra.length === 0) {
          console.log(`   ✅ All expected columns present`);
        }
      } else {
        console.log(`   ℹ️  No expected schema defined for this table`);
      }

      // Check for common timestamp columns
      const hasCreatedAt = columnNames.includes('created_at');
      const hasUpdatedAt = columnNames.includes('updated_at');

      if (!hasCreatedAt && !hasUpdatedAt) {
        recommendations.push({
          table: tableName,
          message: 'Consider adding created_at and updated_at timestamp columns'
        });
      }

      // Show detailed structure for critical tables
      if (['users', 'trips', 'admins'].includes(tableName)) {
        console.log('\n   Detailed Structure:');
        console.table(columns.map(col => ({
          Field: col.Field,
          Type: col.Type,
          Null: col.Null,
          Key: col.Key,
          Default: col.Default,
          Extra: col.Extra
        })));
      }
    }

    // Summary Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY\n');

    if (issues.length === 0) {
      console.log('✅ All critical tables have the required columns!');
    } else {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach(issue => {
        console.log(`   Table: ${issue.table}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Missing columns: ${issue.columns.join(', ')}\n`);
      });
    }

    if (recommendations.length > 0) {
      console.log(`\n💡 Recommendations (${recommendations.length}):\n`);
      recommendations.forEach(rec => {
        console.log(`   Table: ${rec.table}`);
        console.log(`   ${rec.message}\n`);
      });
    }

    // Check for indexes on critical tables
    console.log('\n' + '='.repeat(80));
    console.log('🔑 INDEX VERIFICATION\n');

    for (const tableName of ['users', 'trips', 'admins']) {
      if (tableNames.includes(tableName)) {
        const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
        console.log(`\n📋 Indexes on ${tableName}:`);

        const indexMap = {};
        indexes.forEach(idx => {
          if (!indexMap[idx.Key_name]) {
            indexMap[idx.Key_name] = {
              columns: [],
              unique: idx.Non_unique === 0,
              type: idx.Index_type
            };
          }
          indexMap[idx.Key_name].columns.push(idx.Column_name);
        });

        Object.entries(indexMap).forEach(([name, info]) => {
          const uniqueLabel = info.unique ? '🔒 UNIQUE' : '📊 INDEX';
          console.log(`   ${uniqueLabel} ${name}: ${info.columns.join(', ')} (${info.type})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification complete!\n');

    return issues;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run verification
verifyAllTables()
  .then((issues) => {
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found! Please review and fix.');
      process.exit(1);
    } else {
      console.log('\n🎉 Database schema is complete!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
