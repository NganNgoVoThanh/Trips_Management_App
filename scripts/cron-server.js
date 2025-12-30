// scripts/cron-server.js
// Background cron server for scheduled tasks
// Chạy các tác vụ định kỳ: check expired approvals, send reminders, etc.

require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');
const { checkExpiredApprovals } = require('./check-expired-approvals');
const { syncAzureUsers } = require('./sync-azure-users-cron');

console.log('\n🤖 Trips Management - Cron Server');
console.log('='.repeat(60));
console.log('\nStarted at:', new Date().toLocaleString('vi-VN'));
console.log('\nScheduled tasks:');
console.log('  • Check expired approvals: Every 6 hours');
console.log('  • Sync Azure AD users: Every day at 2:00 AM');
console.log('  • Send reminder emails: Every day at 9:00 AM');
console.log('\n' + '='.repeat(60) + '\n');

// Task 1: Check expired approvals every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('\n[CRON] Running: Check expired approvals');
  try {
    await checkExpiredApprovals();
  } catch (error) {
    console.error('[CRON] Failed:', error.message);
  }
});

// Task 2: Sync Azure AD users every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('\n[CRON] Running: Sync Azure AD users');
  try {
    await syncAzureUsers();
  } catch (error) {
    console.error('[CRON] Failed:', error.message);
  }
});

// Task 3: Send reminder emails every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('\n[CRON] Running: Send reminder emails');
  try {
    // TODO: Implement reminder email function
    // await sendPendingApprovalReminders();
    console.log('⏭️  Reminder emails not implemented yet');
  } catch (error) {
    console.error('[CRON] Failed:', error.message);
  }
});

// Task 3: Run expired check immediately on startup
(async () => {
  console.log('[STARTUP] Running initial expired approval check...\n');
  try {
    await checkExpiredApprovals();
  } catch (error) {
    console.error('[STARTUP] Failed:', error.message);
  }
})();

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Cron server stopped\n');
  process.exit(0);
});

console.log('✅ Cron server is running. Press Ctrl+C to stop.\n');
