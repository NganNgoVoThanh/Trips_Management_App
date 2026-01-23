// scripts/fix-collation.js
// Script to fix collation issues in stored procedures

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function fixCollation() {
  console.log('🔧 Starting collation fix...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log('✅ Connected to database\n');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../sql/fix_collation_issue.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    console.log('📄 Executing SQL script...\n');

    // Split by DELIMITER and execute statements
    const statements = sqlContent
      .replace(/DELIMITER \$\$/g, '')
      .replace(/DELIMITER ;/g, '')
      .split('$$')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('SELECT ') && statement.includes(' AS status')) {
        // Status messages
        const [rows] = await connection.query(statement);
        if (rows && rows[0]) {
          console.log(`📌 ${Object.values(rows[0])[0]}`);
        }
      } else if (statement.trim().length > 0) {
        // Execute other statements
        await connection.query(statement);
      }
    }

    console.log('\n✅ Collation fix completed successfully!');
    console.log('\n📋 Verification:');

    // Verify stored procedures exist
    const [procedures] = await connection.query(`
      SHOW PROCEDURE STATUS
      WHERE Db = ? AND Name IN ('sp_grant_admin_role', 'sp_revoke_admin_role')
    `, [process.env.DB_NAME]);

    procedures.forEach(proc => {
      console.log(`   ✓ ${proc.Name} - ${proc.Type}`);
    });

  } catch (error) {
    console.error('\n❌ Error fixing collation:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixCollation();
