// scripts/check-all-id-columns.js
// Check ID columns in all critical tables

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllIdColumns() {
  console.log('🔍 Checking ID columns in all tables...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const criticalTables = [
      'users',
      'trips',
      'admins',
      'locations',
      'join_requests',
      'admin_override_log',
      'manager_confirmations',
      'allowed_email_domains',
      'vehicles'
    ];

    const issues = [];

    console.log('📋 ID Column Analysis:\n');

    for (const table of criticalTables) {
      try {
        const [cols] = await connection.query(`DESCRIBE ${table}`);
        const idCol = cols.find(c => c.Field === 'id');

        if (!idCol) {
          console.log(`⚠️  ${table}: NO ID COLUMN FOUND`);
          issues.push({ table, issue: 'No ID column' });
          continue;
        }

        const isAutoIncrement = idCol.Extra.includes('auto_increment');
        const isInt = idCol.Type.includes('int');
        const isPrimaryKey = idCol.Key === 'PRI';

        const status = isAutoIncrement ? '✅' : '❌';
        console.log(`${status} ${table}.id:`);
        console.log(`     Type: ${idCol.Type}`);
        console.log(`     Extra: ${idCol.Extra || '(none)'}`);
        console.log(`     Primary Key: ${isPrimaryKey ? 'Yes' : 'No'}`);

        if (!isAutoIncrement && isInt) {
          issues.push({
            table,
            issue: 'INT but missing AUTO_INCREMENT',
            type: idCol.Type
          });
        } else if (!isInt) {
          issues.push({
            table,
            issue: 'Not INT type',
            type: idCol.Type
          });
        }

        console.log('');
      } catch (error) {
        console.log(`⚠️  ${table}: Table not found or error - ${error.message}\n`);
      }
    }

    console.log('='.repeat(60));
    console.log('\n📊 SUMMARY:\n');

    if (issues.length === 0) {
      console.log('✅ All tables have properly configured ID columns!');
    } else {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach(issue => {
        console.log(`   Table: ${issue.table}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.type) console.log(`   Current Type: ${issue.type}`);
        console.log('');
      });
    }

    return issues;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run check
checkAllIdColumns()
  .then((issues) => {
    if (issues.length > 0) {
      console.log('\n⚠️  Some tables need ID column fixes!');
      process.exit(1);
    } else {
      console.log('\n🎉 All ID columns are properly configured!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });
