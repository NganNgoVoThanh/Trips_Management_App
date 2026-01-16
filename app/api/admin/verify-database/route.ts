// app/api/admin/verify-database/route.ts
// Admin endpoint to verify database setup and table structure

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

interface TableCheck {
  name: string;
  exists: boolean;
  rowCount: number;
  columns: string[];
  missingColumns: string[];
  error?: string;
}

// Expected table definitions
const REQUIRED_TABLES = {
  users: [
    'id', 'azure_id', 'email', 'employee_id', 'name', 'role',
    'manager_email', 'manager_name', 'profile_completed',
    'manager_confirmed', 'status', 'created_at', 'updated_at'
  ],
  trips: [
    'id', 'user_id', 'user_name', 'user_email',
    'departure_location', 'destination',
    'departure_date', 'departure_time', 'return_date', 'return_time',
    'status', 'vehicle_type', 'estimated_cost',
    'manager_approval_status', 'manager_approval_token',
    'is_urgent', 'auto_approved', 'purpose',
    'expired_notification_sent', 'data_type',
    'created_at', 'updated_at'
  ],
  optimization_groups: [
    'id', 'trips', 'proposed_departure_time', 'vehicle_type',
    'estimated_savings', 'status', 'created_by', 'created_at'
  ],
  join_requests: [
    'id', 'trip_id', 'requester_email', 'requester_name',
    'status', 'reason', 'created_at'
  ],
  vehicles: [
    'id', 'name', 'type', 'capacity', 'cost_per_km', 'status'
  ],
  approval_audit_log: [
    'id', 'trip_id', 'action', 'actor_email', 'old_status', 'new_status', 'created_at'
  ],
  admin_override_log: [
    'id', 'trip_id', 'action_type', 'admin_email', 'reason',
    'user_email', 'user_name', 'created_at'
  ],
  manager_confirmations: [
    'id', 'user_id', 'user_email', 'pending_manager_email',
    'confirmation_token', 'confirmed', 'expires_at'
  ],
  azure_ad_users_cache: [
    'id', 'azure_id', 'email', 'display_name', 'is_active'
  ]
};

export async function GET(request: NextRequest) {
  // Check admin authentication
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    // Check environment variables
    const envCheck = {
      DB_HOST: !!process.env.DB_HOST,
      DB_PORT: !!process.env.DB_PORT,
      DB_USER: !!process.env.DB_USER,
      DB_PASSWORD: !!process.env.DB_PASSWORD,
      DB_NAME: !!process.env.DB_NAME,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      APPROVAL_TOKEN_SECRET: !!process.env.APPROVAL_TOKEN_SECRET,
      AZURE_AD_CLIENT_ID: !!process.env.AZURE_AD_CLIENT_ID,
      AZURE_AD_CLIENT_SECRET: !!process.env.AZURE_AD_CLIENT_SECRET,
      AZURE_AD_TENANT_ID: !!process.env.AZURE_AD_TENANT_ID,
    };

    const allEnvSet = Object.values(envCheck).every(v => v);

    // Try to connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get all tables in database
    const [existingTables] = await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [process.env.DB_NAME]
    ) as any[];

    const tableNames = existingTables.map((t: any) => t.TABLE_NAME || t.table_name);

    // Check each required table
    const tableChecks: TableCheck[] = [];

    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLES)) {
      const check: TableCheck = {
        name: tableName,
        exists: tableNames.includes(tableName),
        rowCount: 0,
        columns: [],
        missingColumns: []
      };

      if (check.exists) {
        try {
          // Get columns
          const [columns] = await connection.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
            [process.env.DB_NAME, tableName]
          ) as any[];

          check.columns = columns.map((c: any) => c.COLUMN_NAME || c.column_name);

          // Check for missing columns
          check.missingColumns = requiredColumns.filter(
            col => !check.columns.includes(col)
          );

          // Get row count
          const [countResult] = await connection.query(
            `SELECT COUNT(*) as count FROM ${tableName}`
          ) as any[];
          check.rowCount = countResult[0]?.count || 0;

        } catch (err: any) {
          check.error = err.message;
        }
      }

      tableChecks.push(check);
    }

    // Check trips table status ENUM
    let tripsStatusEnum: string[] = [];
    try {
      const [enumResult] = await connection.query(`
        SELECT COLUMN_TYPE FROM information_schema.columns
        WHERE table_schema = ? AND table_name = 'trips' AND column_name = 'status'
      `, [process.env.DB_NAME]) as any[];

      if (enumResult[0]?.COLUMN_TYPE) {
        const enumStr = enumResult[0].COLUMN_TYPE;
        const match = enumStr.match(/enum\((.*)\)/i);
        if (match) {
          tripsStatusEnum = match[1].split(',').map((s: string) => s.replace(/'/g, '').trim());
        }
      }
    } catch (err) {
      // Ignore
    }

    // Expected status values
    const expectedStatuses = [
      'pending_approval', 'pending_urgent', 'auto_approved',
      'approved', 'approved_solo', 'optimized',
      'rejected', 'cancelled', 'expired'
    ];

    const missingStatuses = expectedStatuses.filter(s => !tripsStatusEnum.includes(s));

    // Summary
    const missingTables = tableChecks.filter(t => !t.exists).map(t => t.name);
    const tablesWithMissingColumns = tableChecks.filter(t => t.missingColumns.length > 0);
    const allTablesOK = missingTables.length === 0 && tablesWithMissingColumns.length === 0;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      checkedBy: session.user.email,

      // Environment check
      environment: {
        configured: envCheck,
        allSet: allEnvSet,
        database: process.env.DB_NAME,
      },

      // Database connection
      connection: {
        status: 'connected',
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
      },

      // Tables summary
      summary: {
        totalRequired: Object.keys(REQUIRED_TABLES).length,
        totalExisting: tableChecks.filter(t => t.exists).length,
        missingTables,
        tablesWithIssues: tablesWithMissingColumns.map(t => ({
          name: t.name,
          missingColumns: t.missingColumns
        })),
        allTablesOK,
      },

      // Status ENUM check
      tripsStatusEnum: {
        current: tripsStatusEnum,
        expected: expectedStatuses,
        missing: missingStatuses,
        isComplete: missingStatuses.length === 0,
      },

      // Detailed table checks
      tables: tableChecks,

      // Data counts
      dataCounts: {
        users: tableChecks.find(t => t.name === 'users')?.rowCount || 0,
        trips: tableChecks.find(t => t.name === 'trips')?.rowCount || 0,
        optimizationGroups: tableChecks.find(t => t.name === 'optimization_groups')?.rowCount || 0,
        joinRequests: tableChecks.find(t => t.name === 'join_requests')?.rowCount || 0,
        auditLogs: tableChecks.find(t => t.name === 'approval_audit_log')?.rowCount || 0,
        overrideLogs: tableChecks.find(t => t.name === 'admin_override_log')?.rowCount || 0,
      },

      // Recommendations
      recommendations: [] as string[],
    };

    // Add recommendations
    if (!allEnvSet) {
      result.recommendations.push('Some environment variables are not set. Check .env.local');
    }
    if (missingTables.length > 0) {
      result.recommendations.push(`Run sql/000_COMPLETE_DATABASE_SETUP.sql to create missing tables: ${missingTables.join(', ')}`);
    }
    if (tablesWithMissingColumns.length > 0) {
      result.recommendations.push('Some tables are missing columns. Run database migrations.');
    }
    if (missingStatuses.length > 0) {
      result.recommendations.push('trips.status ENUM is missing some values. Run migration to update.');
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Database verification error:', error);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      connection: {
        status: 'failed',
        error: error.code || error.message,
      },
      recommendations: [
        'Check database connection settings in .env.local',
        'Ensure MySQL server is running',
        'Verify credentials are correct',
      ]
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
