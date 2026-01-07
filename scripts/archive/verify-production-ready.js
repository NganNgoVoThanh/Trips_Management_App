// scripts/verify-production-ready.js
// Kiểm tra hệ thống đã sẵn sàng vận hành production chưa

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function verifyProductionReady() {
  console.log('🔍 KIỂM TRA HỆ THỐNG SẴN SÀNG VẬN HÀNH\n');

  const issues = [];
  const warnings = [];
  const success = [];

  // ============================================
  // 1. Kiểm tra Environment Variables
  // ============================================
  console.log('📋 1. Environment Variables...\n');

  const requiredEnvVars = [
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET',
    'AZURE_AD_TENANT_ID',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'EMAIL_HOST',
    'EMAIL_USER',
    'APPROVAL_TOKEN_SECRET',
  ];

  requiredEnvVars.forEach((varName) => {
    if (process.env[varName]) {
      if (
        process.env[varName].includes('your-') ||
        process.env[varName].includes('change-in-production') ||
        process.env[varName].includes('here')
      ) {
        issues.push(`❌ ${varName} chưa được cấu hình (vẫn là placeholder)`);
      } else {
        success.push(`✅ ${varName}`);
      }
    } else {
      issues.push(`❌ ${varName} chưa được set`);
    }
  });

  // Kiểm tra EMAIL_PASSWORD riêng
  if (!process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD.includes('your-')) {
    warnings.push(
      `⚠️  EMAIL_PASSWORD chưa cấu hình - Email approval sẽ không hoạt động`
    );
  } else {
    success.push(`✅ EMAIL_PASSWORD`);
  }

  console.log(success.slice(0, 5).join('\n'));
  console.log(`... và ${success.length - 5} biến khác\n`);

  // ============================================
  // 2. Kiểm tra Database Connection
  // ============================================
  console.log('📋 2. Database Connection...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    success.push('✅ Database connection successful');
    console.log('✅ Kết nối database thành công\n');

    // ============================================
    // 3. Kiểm tra Tables
    // ============================================
    console.log('📋 3. Database Tables...\n');

    const requiredTables = [
      'users',
      'azure_ad_users_cache',
      'trips',
      'approval_audit_log',
      'vehicles',
    ];

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map((t) => Object.values(t)[0]);

    requiredTables.forEach((tableName) => {
      if (tableNames.includes(tableName)) {
        success.push(`✅ Table: ${tableName}`);
      } else {
        issues.push(`❌ Table chưa tạo: ${tableName}`);
      }
    });

    console.log(`✅ Tìm thấy ${tableNames.length} tables\n`);

    // ============================================
    // 4. Kiểm tra Trips Table Schema
    // ============================================
    console.log('📋 4. Trips Table Schema...\n');

    const [columns] = await connection.query('DESCRIBE trips');
    const columnNames = columns.map((c) => c.Field);

    const requiredColumns = [
      'manager_approval_status',
      'manager_approval_token',
      'manager_approval_token_expires',
      'cc_emails',
      'is_urgent',
      'auto_approved',
      'purpose',
      'assigned_vehicle_id',
      'created_by_admin',
    ];

    requiredColumns.forEach((colName) => {
      if (columnNames.includes(colName)) {
        success.push(`✅ Column: ${colName}`);
      } else {
        issues.push(`❌ Column chưa có: ${colName} (chạy scripts/add-vehicle-tables.js)`);
      }
    });

    console.log(`✅ Trips table có ${columnNames.length} columns\n`);

    // ============================================
    // 5. Kiểm tra Admin Users
    // ============================================
    console.log('📋 5. Admin Users...\n');

    const [admins] = await connection.query(
      "SELECT email, name FROM users WHERE role = 'admin'"
    );

    if (admins.length === 0) {
      warnings.push(
        '⚠️  Chưa có admin user nào - Cần tạo admin đầu tiên để quản lý hệ thống'
      );
      console.log('⚠️  Chưa có admin user\n');
    } else {
      success.push(`✅ Có ${admins.length} admin users`);
      console.log(`✅ Admin users (${admins.length}):`);
      admins.forEach((admin) => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
      console.log('');
    }

    // ============================================
    // 6. Kiểm tra Azure AD Users Cache
    // ============================================
    console.log('📋 6. Azure AD Users Cache...\n');

    const [azureUsers] = await connection.query(
      'SELECT COUNT(*) as total, SUM(is_active) as active FROM azure_ad_users_cache'
    );

    const total = azureUsers[0].total;
    const active = azureUsers[0].active;

    if (total === 0) {
      warnings.push(
        '⚠️  Azure AD users cache trống - Chạy "npm run sync-azure" để sync users'
      );
      console.log('⚠️  Cache trống - cần sync\n');
    } else {
      success.push(`✅ ${total} cached users (${active} active)`);
      console.log(`✅ ${total} users cached (${active} active)\n`);
    }

    // ============================================
    // 7. Kiểm tra Vehicles
    // ============================================
    console.log('📋 7. Vehicles...\n');

    const [vehicles] = await connection.query(
      "SELECT COUNT(*) as total FROM vehicles WHERE status = 'active'"
    );

    const vehicleCount = vehicles[0].total;

    if (vehicleCount === 0) {
      warnings.push('⚠️  Chưa có vehicle nào - Chạy scripts/add-vehicle-tables.js');
      console.log('⚠️  Chưa có vehicles\n');
    } else {
      success.push(`✅ ${vehicleCount} active vehicles`);
      console.log(`✅ ${vehicleCount} active vehicles\n`);
    }

    // ============================================
    // 8. Kiểm tra Sample Data
    // ============================================
    console.log('📋 8. Sample Data...\n');

    const [trips] = await connection.query('SELECT COUNT(*) as total FROM trips');
    const [users] = await connection.query('SELECT COUNT(*) as total FROM users');

    console.log(`   📊 ${users[0].total} users đã login`);
    console.log(`   📊 ${trips[0].total} trips trong hệ thống\n`);

    await connection.end();
  } catch (error) {
    issues.push(`❌ Database error: ${error.message}`);
    console.log(`❌ Lỗi database: ${error.message}\n`);
  }

  // ============================================
  // 9. Kiểm tra Files
  // ============================================
  console.log('📋 9. Critical Files...\n');

  const requiredFiles = [
    'public/manifest.json',
    'public/sw.js',
    'app/api/admin/export-trips/route.ts',
    'app/api/admin/create-trip-for-user/route.ts',
    'app/api/admin/assign-vehicle/route.ts',
    'scripts/sync-azure-users-cron.js',
    'scripts/cron-server.js',
    'lib/email-approval-service.ts',
    'lib/audit-log-service.ts',
  ];

  requiredFiles.forEach((file) => {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      success.push(`✅ File: ${file}`);
    } else {
      issues.push(`❌ File missing: ${file}`);
    }
  });

  console.log(`✅ Tất cả critical files đã có\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 TÓM TẮT KIỂM TRA');
  console.log('═'.repeat(60));
  console.log('');

  console.log(`✅ Passed: ${success.length} checks`);
  console.log(`⚠️  Warnings: ${warnings.length} issues`);
  console.log(`❌ Failed: ${issues.length} critical issues`);
  console.log('');

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((w) => console.log(`   ${w}`));
    console.log('');
  }

  if (issues.length > 0) {
    console.log('❌ CRITICAL ISSUES (PHẢI FIX TRƯỚC KHI PRODUCTION):');
    issues.forEach((i) => console.log(`   ${i}`));
    console.log('');
    console.log('📖 Xem hướng dẫn chi tiết: PRODUCTION-DEPLOYMENT-CHECKLIST.md');
    console.log('');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('⚠️  Hệ thống có thể chạy nhưng cần khắc phục các warnings trên');
    console.log('');
    process.exit(0);
  }

  console.log('✅ HỆ THỐNG SẴN SÀNG VẬN HÀNH!');
  console.log('');
  console.log('🚀 Các bước tiếp theo:');
  console.log('   1. Chạy "npm run build:production"');
  console.log('   2. Chạy "npm run pm2:start:production"');
  console.log('   3. Chạy "npm run cron:start"');
  console.log('   4. Verify với "pm2 status"');
  console.log('');
  process.exit(0);
}

// Chạy kiểm tra
verifyProductionReady().catch((error) => {
  console.error('❌ Lỗi khi kiểm tra:', error);
  process.exit(1);
});
