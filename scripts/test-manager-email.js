#!/usr/bin/env node
/**
 * Test Manager Confirmation Email Sending
 * This script simulates the profile setup flow to test email sending
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001';

// ===== Copy of email service functions =====

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Check if Microsoft Graph is configured
function isGraphConfigured() {
  const clientId = process.env.GRAPH_CLIENT_ID || '';
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || '';
  const tenantId = process.env.AZURE_AD_TENANT_ID || '';
  return !!(clientId && clientSecret && tenantId);
}

// Get OAuth2 access token
async function getGraphAccessToken() {
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  console.log('Requesting Graph API access token...');
  console.log('Token endpoint:', tokenEndpoint);

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token request failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('Access token obtained successfully');
  return data.access_token;
}

// Send email via Graph API
async function sendEmailViaGraph(to, subject, html) {
  const accessToken = await getGraphAccessToken();

  // Use the no-reply sender
  const senderEmail = process.env.EMAIL_NO_REPLY || 'no-reply.trips@intersnack.com.vn';
  const sendMailEndpoint = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

  console.log('Sending email via Graph API...');
  console.log('From:', senderEmail);
  console.log('To:', to);
  console.log('Subject:', subject);

  const emailMessage = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        { emailAddress: { address: to } }
      ]
    },
    saveToSentItems: true
  };

  const response = await fetch(sendMailEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailMessage)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Send email failed: ${response.status} - ${error}`);
  }

  console.log('Email sent successfully!');
  return true;
}

// ===== Main test =====

async function testManagerConfirmationEmail() {
  console.log('========================================');
  console.log('Testing Manager Confirmation Email');
  console.log('========================================\n');

  // Step 1: Check configuration
  console.log('Step 1: Checking configuration...');
  console.log('GRAPH_CLIENT_ID:', process.env.GRAPH_CLIENT_ID ? 'Set' : 'NOT SET');
  console.log('GRAPH_CLIENT_SECRET:', process.env.GRAPH_CLIENT_SECRET ? 'Set' : 'NOT SET');
  console.log('AZURE_AD_TENANT_ID:', process.env.AZURE_AD_TENANT_ID ? 'Set' : 'NOT SET');
  console.log('EMAIL_NO_REPLY:', process.env.EMAIL_NO_REPLY || 'NOT SET');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  if (!isGraphConfigured()) {
    console.log('ERROR: Microsoft Graph API is not configured!');
    return;
  }

  console.log('Graph API is configured.');
  console.log('');

  // Step 2: Connect to database
  console.log('Step 2: Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  console.log('Connected to database');
  console.log('');

  // Step 3: Get the pending manager info
  console.log('Step 3: Getting user with pending manager...');
  const [users] = await connection.query(
    'SELECT id, email, name, pending_manager_email FROM users WHERE pending_manager_email IS NOT NULL LIMIT 1'
  );

  if (users.length === 0) {
    console.log('No users with pending manager found');
    await connection.end();
    return;
  }

  const user = users[0];
  console.log('User:', user.name, '(' + user.email + ')');
  console.log('Pending Manager:', user.pending_manager_email);
  console.log('');

  // Step 4: Generate token and create confirmation record
  console.log('Step 4: Creating confirmation record...');
  const confirmationId = 'confirm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    await connection.query(
      `INSERT INTO manager_confirmations
       (id, user_id, manager_email, token, type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [confirmationId, user.id, user.pending_manager_email, token, 'initial', expiresAt]
    );
    console.log('Confirmation record created: ' + confirmationId);
    console.log('Token: ' + token.substring(0, 20) + '...');
    console.log('');
  } catch (err) {
    console.log('ERROR creating confirmation record:', err.message);
    await connection.end();
    return;
  }

  // Step 5: Generate confirmation URLs
  const confirmUrl = BASE_URL + '/api/manager/confirm?token=' + token + '&action=confirm';
  const rejectUrl = BASE_URL + '/api/manager/confirm?token=' + token + '&action=reject';
  console.log('Step 5: URLs generated');
  console.log('Confirm URL:', confirmUrl.substring(0, 60) + '...');
  console.log('Reject URL:', rejectUrl.substring(0, 60) + '...');
  console.log('');

  // Step 6: Send email
  console.log('Step 6: Sending confirmation email...');
  const subject = 'Manager Confirmation Request from ' + user.name;
  const html = `
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Manager Confirmation Request</h2>
      <p>Dear Manager,</p>
      <p><strong>${user.name}</strong> (${user.email}) has designated you as their direct reporting manager in the Trips Management System.</p>
      <p>Please confirm or reject this request:</p>
      <p>
        <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">Confirm</a>
        <a href="${rejectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #e53e3e; color: white; text-decoration: none; border-radius: 6px;">Reject</a>
      </p>
      <p>This link expires on ${expiresAt.toLocaleDateString()}.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Trips Management System - Intersnack Vietnam</p>
    </body>
    </html>
  `;

  try {
    await sendEmailViaGraph(user.pending_manager_email, subject, html);
    console.log('');
    console.log('SUCCESS! Email sent to ' + user.pending_manager_email);
    console.log('');
    console.log('Manager should check their inbox (and spam folder) for the confirmation email.');
  } catch (error) {
    console.log('');
    console.log('ERROR sending email:', error.message);
    console.log('');
    console.log('Possible causes:');
    console.log('1. Graph API credentials are incorrect');
    console.log('2. no-reply.trips@intersnack.com.vn mailbox does not exist in Azure AD');
    console.log('3. App does not have Mail.Send permission');
    console.log('4. Network/firewall issue');
  }

  await connection.end();
  console.log('');
  console.log('========================================');
}

testManagerConfirmationEmail().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
