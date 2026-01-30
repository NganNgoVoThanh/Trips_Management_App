const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('\n📊 Checking admin_audit_log structure:\n');

  const [columns] = await connection.query('DESCRIBE admin_audit_log');
  
  console.table(columns.map(col => ({
    Field: col.Field,
    Type: col.Type,
    Null: col.Null,
    Key: col.Key,
    Default: col.Default
  })));

  await connection.end();
}

checkStructure().catch(console.error);
