// scripts/test-email-bypass.js
// Script để test email workflow trên local mà không cần gửi email thật
// Sử dụng để simulate manager confirmation và trip approval

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Try to load .env.local first, fallback to .env
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
  console.log('✓ Loaded environment from .env.local\n');
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✓ Loaded environment from .env\n');
} else {
  console.error('❌ No .env or .env.local file found!\n');
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:50001';

async function getConnection() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  // Debug: Show connection config (hide password)
  console.log('\n🔌 Database Connection Config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Password: ${config.password ? '***' : 'NOT SET'}\n`);

  if (!config.user || !config.password || !config.database) {
    throw new Error('❌ Missing database credentials in .env file. Please check DB_USER, DB_PASSWORD, DB_NAME');
  }

  return await mysql.createConnection(config);
}

// =====================================================
// MANAGER CONFIRMATION TEST
// =====================================================

/**
 * List tất cả pending manager confirmations
 */
async function listPendingManagerConfirmations() {
  const connection = await getConnection();

  try {
    const [rows] = await connection.query(`
      SELECT
        mc.id,
        mc.user_id,
        u.email as user_email,
        u.name as user_name,
        mc.manager_email,
        mc.type,
        mc.token,
        mc.created_at,
        mc.expires_at,
        mc.confirmed
      FROM manager_confirmations mc
      JOIN users u ON CAST(mc.user_id AS CHAR) = CAST(u.id AS CHAR)
      WHERE mc.confirmed = FALSE
      ORDER BY mc.created_at DESC
    `);

    if (rows.length === 0) {
      console.log('\n📭 Không có manager confirmation nào đang pending\n');
      return [];
    }

    console.log('\n📧 Pending Manager Confirmations:\n');
    console.log('═'.repeat(100));

    rows.forEach((row, index) => {
      console.log(`\n${index + 1}. User: ${row.user_name} (${row.user_email})`);
      console.log(`   Manager Email: ${row.manager_email}`);
      console.log(`   Type: ${row.type}`);
      console.log(`   Token: ${row.token}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Expires: ${row.expires_at}`);
      console.log(`   \n   ✅ Confirm URL: ${BASE_URL}/api/manager/confirm?token=${row.token}&action=confirm`);
      console.log(`   ❌ Reject URL:  ${BASE_URL}/api/manager/confirm?token=${row.token}&action=reject`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log(`\n💡 Copy URL trên và paste vào browser để test confirmation\n`);

    return rows;
  } finally {
    await connection.end();
  }
}

/**
 * Manually confirm manager (bypass email)
 */
async function confirmManager(token, action = 'confirm') {
  const connection = await getConnection();

  try {
    // Find confirmation
    const [rows] = await connection.query(`
      SELECT mc.*, u.email as user_email, u.name as user_name
      FROM manager_confirmations mc
      JOIN users u ON CAST(mc.user_id AS CHAR) = CAST(u.id AS CHAR)
      WHERE mc.token = ? AND mc.confirmed = FALSE
    `, [token]);

    if (rows.length === 0) {
      console.log('❌ Token không hợp lệ hoặc đã được confirm');
      return false;
    }

    const confirmation = rows[0];
    console.log(`\n📋 Processing confirmation for: ${confirmation.user_name} (${confirmation.user_email})`);
    console.log(`   Manager Email: ${confirmation.manager_email}`);

    if (action === 'confirm') {
      // Get manager's name from users table (if exists)
      const [managerRows] = await connection.query(
        `SELECT name FROM users WHERE email = ?`,
        [confirmation.manager_email]
      );
      const managerName = managerRows.length > 0 ? managerRows[0].name : null;

      // Update user's manager
      await connection.query(`
        UPDATE users
        SET manager_email = ?,
            manager_name = ?,
            manager_confirmed = TRUE,
            manager_confirmed_at = NOW(),
            pending_manager_email = NULL,
            manager_change_requested_at = NULL
        WHERE id = ?
      `, [confirmation.manager_email, managerName, confirmation.user_id]);

      // Mark confirmation as completed
      await connection.query(`
        UPDATE manager_confirmations
        SET confirmed = TRUE, confirmed_at = NOW()
        WHERE id = ?
      `, [confirmation.id]);

      console.log(`\n✅ Manager confirmed successfully!`);
      console.log(`   User ${confirmation.user_name} now has manager: ${confirmation.manager_email}`);
    } else {
      // Rejection
      await connection.query(
        `DELETE FROM manager_confirmations WHERE id = ?`,
        [confirmation.id]
      );

      console.log(`\n❌ Manager confirmation rejected!`);
      console.log(`   Token deleted. User needs to select a new manager.`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await connection.end();
  }
}

// =====================================================
// TRIP APPROVAL TEST
// =====================================================

/**
 * List tất cả pending trip approvals
 */
async function listPendingTripApprovals() {
  const connection = await getConnection();

  try {
    const [rows] = await connection.query(`
      SELECT
        t.id,
        t.userName,
        t.userEmail,
        t.departureLocation,
        t.destination,
        t.departureDate,
        t.departureTime,
        t.status,
        t.manager_approval_status,
        t.is_urgent,
        t.created_at,
        u.manager_email,
        u.manager_name
      FROM trips t
      JOIN users u ON COLLATE(t.userEmail, utf8mb4_unicode_ci) = COLLATE(u.email, utf8mb4_unicode_ci)
      WHERE t.manager_approval_status = 'pending'
      ORDER BY t.created_at DESC
    `);

    if (rows.length === 0) {
      console.log('\n📭 Không có trip approval nào đang pending\n');
      return [];
    }

    console.log('\n🚗 Pending Trip Approvals:\n');
    console.log('═'.repeat(100));

    rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Trip #${row.id} - ${row.userName} (${row.userEmail})`);
      console.log(`   Route: ${row.departureLocation} → ${row.destination}`);
      console.log(`   Departure: ${row.departureDate} ${row.departureTime}`);
      console.log(`   Manager: ${row.manager_name} (${row.manager_email})`);
      console.log(`   Status: ${row.manager_approval_status}${row.is_urgent ? ' ⚠️ URGENT' : ''}`);
      console.log(`   Created: ${row.created_at}`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log(`\n💡 Sử dụng: node scripts/test-email-bypass.js approve-trip <trip_id> [reject]\n`);

    return rows;
  } finally {
    await connection.end();
  }
}

/**
 * Manually approve/reject trip (bypass email)
 */
async function approveTripManually(tripId, action = 'approve') {
  const connection = await getConnection();

  try {
    // Get trip details
    const [trips] = await connection.query(`
      SELECT t.*, u.manager_email, u.manager_name
      FROM trips t
      JOIN users u ON COLLATE(t.userEmail, utf8mb4_unicode_ci) = COLLATE(u.email, utf8mb4_unicode_ci)
      WHERE t.id = ?
    `, [tripId]);

    if (trips.length === 0) {
      console.log('❌ Trip không tồn tại');
      return false;
    }

    const trip = trips[0];
    console.log(`\n📋 Processing trip #${tripId}`);
    console.log(`   User: ${trip.userName} (${trip.userEmail})`);
    console.log(`   Route: ${trip.departureLocation} → ${trip.destination}`);
    console.log(`   Manager: ${trip.manager_name} (${trip.manager_email})`);

    if (action === 'approve') {
      // Approve trip
      await connection.query(`
        UPDATE trips
        SET manager_approval_status = 'approved',
            manager_approved_at = NOW(),
            manager_approved_by = ?,
            status = 'approved'
        WHERE id = ?
      `, [trip.manager_email, tripId]);

      // Log to audit trail
      await connection.query(`
        INSERT INTO trip_audit_log
        (trip_id, action, actor_email, actor_name, actor_role, old_status, new_status, notes)
        VALUES (?, 'approve', ?, ?, 'manager', 'pending', 'approved', 'Manual approval via test script')
      `, [tripId, trip.manager_email, trip.manager_name]);

      console.log(`\n✅ Trip #${tripId} approved successfully!`);
    } else {
      // Reject trip
      await connection.query(`
        UPDATE trips
        SET manager_approval_status = 'rejected',
            manager_rejected_at = NOW(),
            manager_rejected_by = ?,
            manager_rejection_reason = ?,
            status = 'rejected'
        WHERE id = ?
      `, [trip.manager_email, 'Manual rejection via test script', tripId]);

      // Log to audit trail
      await connection.query(`
        INSERT INTO trip_audit_log
        (trip_id, action, actor_email, actor_name, actor_role, old_status, new_status, notes)
        VALUES (?, 'reject', ?, ?, 'manager', 'pending', 'rejected', 'Manual rejection via test script')
      `, [tripId, trip.manager_email, trip.manager_name]);

      console.log(`\n❌ Trip #${tripId} rejected successfully!`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await connection.end();
  }
}

// =====================================================
// CLI INTERFACE
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🧪 EMAIL BYPASS TEST TOOL');
  console.log('═'.repeat(50));

  try {
    switch (command) {
      case 'list-managers':
      case 'managers':
        await listPendingManagerConfirmations();
        break;

      case 'confirm-manager':
      case 'confirm':
        if (!args[1]) {
          console.log('\n❌ Usage: node scripts/test-email-bypass.js confirm-manager <token> [reject]\n');
          process.exit(1);
        }
        const action = args[2] === 'reject' ? 'reject' : 'confirm';
        await confirmManager(args[1], action);
        break;

      case 'list-trips':
      case 'trips':
        await listPendingTripApprovals();
        break;

      case 'approve-trip':
      case 'approve':
        if (!args[1]) {
          console.log('\n❌ Usage: node scripts/test-email-bypass.js approve-trip <trip_id> [reject]\n');
          process.exit(1);
        }
        const tripAction = args[2] === 'reject' ? 'reject' : 'approve';
        await approveTripManually(args[1], tripAction);
        break;

      default:
        console.log('\n📖 Available Commands:\n');
        console.log('  node scripts/test-email-bypass.js list-managers');
        console.log('    → List all pending manager confirmations\n');
        console.log('  node scripts/test-email-bypass.js confirm-manager <token> [reject]');
        console.log('    → Confirm or reject manager (bypass email)\n');
        console.log('  node scripts/test-email-bypass.js list-trips');
        console.log('    → List all pending trip approvals\n');
        console.log('  node scripts/test-email-bypass.js approve-trip <trip_id> [reject]');
        console.log('    → Approve or reject trip (bypass email)\n');
        console.log('═'.repeat(50));
        console.log('\n💡 Examples:');
        console.log('  node scripts/test-email-bypass.js managers');
        console.log('  node scripts/test-email-bypass.js confirm abc123token');
        console.log('  node scripts/test-email-bypass.js confirm abc123token reject');
        console.log('  node scripts/test-email-bypass.js trips');
        console.log('  node scripts/test-email-bypass.js approve 5');
        console.log('  node scripts/test-email-bypass.js approve 5 reject\n');
        break;
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
