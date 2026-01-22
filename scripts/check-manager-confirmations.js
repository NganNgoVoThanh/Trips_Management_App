#!/usr/bin/env node
/**
 * Check Manager Confirmation Records and Email Configuration
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkManagerConfirmations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('========================================');
  console.log('Checking Manager Confirmation Records');
  console.log('========================================\n');

  // Check if manager_confirmations table has records
  const [records] = await connection.query('SELECT * FROM manager_confirmations ORDER BY created_at DESC LIMIT 10');

  console.log('Manager confirmation records:', records.length);
  if (records.length > 0) {
    records.forEach((r, i) => {
      console.log('');
      console.log((i+1) + '. ID: ' + r.id);
      console.log('   User ID: ' + r.user_id);
      console.log('   Manager Email: ' + r.manager_email);
      console.log('   Token: ' + (r.token ? r.token.substring(0, 20) + '...' : 'NULL'));
      console.log('   Confirmed: ' + r.confirmed);
      console.log('   Expires: ' + r.expires_at);
      console.log('   Created: ' + r.created_at);
    });
  } else {
    console.log('');
    console.log('NO manager confirmation records found!');
    console.log('This means sendManagerConfirmationEmail may have failed');
  }

  // Check users with pending_manager_email
  const [pendingUsers] = await connection.query(
    'SELECT id, email, name, pending_manager_email, manager_email, manager_confirmed FROM users WHERE pending_manager_email IS NOT NULL'
  );

  console.log('');
  console.log('========================================');
  console.log('Users with pending_manager_email');
  console.log('========================================');
  console.log('Count:', pendingUsers.length);

  pendingUsers.forEach((u, i) => {
    console.log('');
    console.log((i+1) + '. ' + u.name + ' (' + u.email + ')');
    console.log('   Pending Manager: ' + u.pending_manager_email);
    console.log('   Current Manager: ' + (u.manager_email || 'NULL'));
    console.log('   Confirmed: ' + u.manager_confirmed);
  });

  // Check Microsoft Graph configuration
  console.log('');
  console.log('========================================');
  console.log('Microsoft Graph Email Configuration');
  console.log('========================================');
  console.log('GRAPH_CLIENT_ID: ' + (process.env.GRAPH_CLIENT_ID ? 'Set' : 'Not set'));
  console.log('GRAPH_CLIENT_SECRET: ' + (process.env.GRAPH_CLIENT_SECRET ? 'Set' : 'Not set'));
  console.log('GRAPH_TENANT_ID (from AZURE_AD_TENANT_ID): ' + (process.env.AZURE_AD_TENANT_ID ? 'Set' : 'Not set'));
  console.log('EMAIL_NO_REPLY: ' + (process.env.EMAIL_NO_REPLY || 'Not set'));
  console.log('NEXT_PUBLIC_BASE_URL: ' + (process.env.NEXT_PUBLIC_BASE_URL || 'Not set'));

  await connection.end();
}

checkManagerConfirmations().catch(console.error);
