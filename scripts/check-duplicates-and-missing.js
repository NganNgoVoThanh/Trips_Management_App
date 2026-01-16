#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n========================================');
  console.log('   DATABASE DUPLICATE & MISSING CHECK');
  console.log('========================================\n');

  // Get all tables in database
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]).sort();

  console.log(`Total tables in database: ${tableNames.length}\n`);

  // 1. CHECK FOR DUPLICATES (same base name with different prefix)
  console.log('=== CHECKING FOR DUPLICATES ===\n');

  const groups = {};
  tableNames.forEach(name => {
    const baseName = name.replace(/^(kpi_|trips_|tm_)/, '');
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(name);
  });

  let hasDuplicates = false;
  Object.entries(groups).forEach(([base, names]) => {
    if (names.length > 1) {
      console.log(`⚠️  Duplicate base name: "${base}"`);
      names.forEach(n => {
        const [count] = connection.query(`SELECT COUNT(*) as cnt FROM \`${n}\``);
        console.log(`   - ${n}`);
      });
      console.log('');
      hasDuplicates = true;
    }
  });

  if (!hasDuplicates) {
    console.log('✅ No duplicate base names found\n');
  }

  // 2. LIST ALL TABLES BY CATEGORY
  console.log('=== TABLES BY CATEGORY ===\n');

  const kpiTables = tableNames.filter(t => t.startsWith('kpi_'));
  const tripsTables = tableNames.filter(t =>
    !t.startsWith('kpi_') &&
    !t.startsWith('v_') &&
    !t.startsWith('DC_') &&
    !t.startsWith('PT') &&
    !t.startsWith('Data_entry')
  );
  const viewsTables = tableNames.filter(t => t.startsWith('v_'));
  const otherTables = tableNames.filter(t =>
    !t.startsWith('kpi_') &&
    !t.startsWith('v_') &&
    (t.startsWith('DC_') || t.startsWith('PT') || t.startsWith('Data_entry'))
  );

  console.log(`📊 KPI System (${kpiTables.length} tables):`);
  kpiTables.forEach(t => console.log(`   - ${t}`));

  console.log(`\n🚗 Trips System (${tripsTables.length} tables):`);
  for (const t of tripsTables) {
    const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
    console.log(`   - ${t} (${count[0].cnt} rows)`);
  }

  console.log(`\n👁️  Views (${viewsTables.length}):`);
  viewsTables.forEach(t => console.log(`   - ${t}`));

  if (otherTables.length > 0) {
    console.log(`\n📦 Other Systems (${otherTables.length} tables):`);
    otherTables.forEach(t => console.log(`   - ${t}`));
  }

  // 3. CHECK REQUIRED TABLES FROM CODE
  console.log('\n=== CHECKING REQUIRED TABLES FROM CODE ===\n');

  const requiredTables = [
    'users',
    'trips',
    'temp_trips',
    'optimization_groups',
    'join_requests',
    'vehicles',
    'manager_confirmations',
    'approval_audit_log',
    'admin_override_log',
    'azure_ad_users_cache',
    'allowed_email_domains',
    'locations',
    'admin_audit_log'
  ];

  let allFound = true;
  for (const req of requiredTables) {
    const exists = tableNames.includes(req);
    if (exists) {
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${req}\``);
      console.log(`✅ ${req} (${count[0].cnt} rows)`);
    } else {
      console.log(`❌ ${req} - MISSING!`);
      allFound = false;
    }
  }

  // 4. CHECK FOR TABLES REFERENCED IN CODE BUT NOT IN REQUIRED LIST
  console.log('\n=== CHECKING CODE REFERENCES ===\n');

  const codeFiles = [
    'lib/mysql-service.ts',
    'lib/user-service.ts',
    'lib/join-request-service.ts',
    'lib/admin-service.ts',
    'lib/audit-log-service.ts'
  ];

  const referencedTables = new Set();
  for (const file of codeFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Find SQL queries
      const fromMatches = content.match(/FROM\s+`?(\w+)`?/gi) || [];
      const intoMatches = content.match(/INTO\s+`?(\w+)`?/gi) || [];
      const updateMatches = content.match(/UPDATE\s+`?(\w+)`?/gi) || [];

      [...fromMatches, ...intoMatches, ...updateMatches].forEach(match => {
        const tableName = match.replace(/FROM\s+|INTO\s+|UPDATE\s+|`/gi, '').trim();
        if (tableName && !tableName.startsWith('SELECT')) {
          referencedTables.add(tableName);
        }
      });
    }
  }

  console.log('Tables referenced in code:');
  const sortedRefs = Array.from(referencedTables).sort();
  sortedRefs.forEach(t => {
    const exists = tableNames.includes(t);
    const inRequired = requiredTables.includes(t);
    if (!exists) {
      console.log(`   ⚠️  ${t} - Referenced but NOT in database!`);
    } else if (!inRequired) {
      console.log(`   ℹ️  ${t} - In DB but not in required list`);
    } else {
      console.log(`   ✅ ${t}`);
    }
  });

  // SUMMARY
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================\n');

  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`Total tables: ${tableNames.length}`);
  console.log(`  - KPI System: ${kpiTables.length} tables`);
  console.log(`  - Trips System: ${tripsTables.length} tables`);
  console.log(`  - Views: ${viewsTables.length}`);
  if (otherTables.length > 0) {
    console.log(`  - Other: ${otherTables.length} tables`);
  }
  console.log('');
  console.log(`Required tables: ${requiredTables.length}`);
  console.log(`Found: ${requiredTables.filter(t => tableNames.includes(t)).length}/${requiredTables.length}`);
  console.log('');

  if (hasDuplicates) {
    console.log('⚠️  WARNING: Duplicate tables found!');
  } else {
    console.log('✅ No duplicates');
  }

  if (allFound) {
    console.log('✅ All required tables present');
  } else {
    console.log('❌ Some required tables missing');
  }

  console.log('');

  await connection.end();
}

main().catch(console.error);
