#!/usr/bin/env node
/**
 * Create allowed_email_domains table
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function main() {
  console.log('\n========================================');
  console.log('   Creating allowed_email_domains table');
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

    console.log(`Connected to ${process.env.DB_NAME}\n`);

    // Create table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS allowed_email_domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        domain VARCHAR(255) NOT NULL UNIQUE,
        description VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain (domain),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table allowed_email_domains created');

    // Insert default domain
    await connection.query(`
      INSERT IGNORE INTO allowed_email_domains (domain, description, active)
      VALUES ('intersnack.com.vn', 'Intersnack Vietnam official domain', TRUE)
    `);

    console.log('✅ Default domain added: intersnack.com.vn');

    // Show current data
    const [rows] = await connection.query('SELECT * FROM allowed_email_domains');
    console.log('\nCurrent domains:');
    rows.forEach(row => {
      console.log(`   - ${row.domain} (active: ${row.active})`);
    });

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main().catch(console.error);
