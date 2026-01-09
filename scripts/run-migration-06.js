
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    console.log('Starting migration...');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'tripsmgm-rndus2',
            password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
            database: process.env.DB_NAME || 'tripsmgm-mydb002',
        });

        console.log('Connected to database.');

        const sqlFile = path.join(__dirname, '..', 'sql', '06-add-admin-creation-columns.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolon to handle multiple statements if needed, 
        // but for this simple file, we can try executing mostly directly or splitting carefully.
        // simplistic split:
        const statements = sql.split(';').filter(s => s.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    console.log('Executed statement successfully.');
                } catch (err) {
                    // Ignore "Duplicate column name" error (code 1060)
                    if (err.errno === 1060) {
                        console.log('Column already exists, skipping.');
                    } else {
                        console.error('Error executing statement:', err.message);
                    }
                }
            }
        }

        console.log('Migration completed.');
        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
