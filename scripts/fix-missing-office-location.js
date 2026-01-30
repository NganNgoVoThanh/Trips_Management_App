// Script to fix users with missing office_location
// Run: node scripts/fix-missing-office-location.js

const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fixMissingOfficeLocation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trips_management'
  });

  console.log('✅ Connected to database\n');

  try {
    // Find users with NULL office_location but profile_completed = TRUE
    const [users] = await connection.execute(`
      SELECT
        id,
        email,
        name,
        department,
        office_location
      FROM users
      WHERE office_location IS NULL
        AND profile_completed = TRUE
    `);

    if (users.length === 0) {
      console.log('✅ No users with missing office_location found!');
      return;
    }

    console.log(`Found ${users.length} user(s) with missing office_location:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Department: ${user.department || '(not set)'}`);
      console.log(`   Office Location: ${user.office_location || '❌ NULL'}\n`);
    });

    // Show available locations
    console.log('Available office locations:');
    console.log('1. HCM Office');
    console.log('2. Long An Factory');
    console.log('3. Phan Thiet Factory');
    console.log('4. Tay Ninh Factory');
    console.log();

    const updateUser = await question('Do you want to update office_location for these users? (y/n): ');

    if (updateUser.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      return;
    }

    // Update each user
    for (const user of users) {
      console.log(`\nUpdating ${user.name}:`);
      console.log('Select office location:');
      console.log('1. HCM Office');
      console.log('2. Long An Factory');
      console.log('3. Phan Thiet Factory');
      console.log('4. Tay Ninh Factory');
      console.log('0. Skip this user');

      const choice = await question('Enter choice (0-4): ');
      const locationMap = {
        '1': 'hcm-office',
        '2': 'long-an-factory',
        '3': 'phan-thiet-factory',
        '4': 'tay-ninh-factory'
      };

      if (choice === '0') {
        console.log('Skipped.');
        continue;
      }

      const locationId = locationMap[choice];
      if (!locationId) {
        console.log('Invalid choice, skipped.');
        continue;
      }

      // Update database
      await connection.execute(`
        UPDATE users
        SET office_location = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [locationId, user.id]);

      console.log(`✅ Updated ${user.email} → office_location: ${locationId}`);
    }

    console.log('\n✅ All updates completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

fixMissingOfficeLocation().catch(console.error);
