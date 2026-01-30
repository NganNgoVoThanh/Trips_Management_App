const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [cols] = await conn.query("DESCRIBE admin_audit_log");
  
  const adminTypeColumns = cols.filter(c => 
    c.Field === 'new_admin_type' || c.Field === 'previous_admin_type'
  );
  
  console.log('\n📊 Admin type columns in admin_audit_log:\n');
  adminTypeColumns.forEach(col => {
    console.log(`${col.Field}:`);
    console.log(`  Type: ${col.Type}`);
    console.log(`  Null: ${col.Null}\n`);
  });

  await conn.end();
}

check();
