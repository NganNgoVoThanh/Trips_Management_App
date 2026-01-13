// app/api/admin/migrate-statuses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

const STATUS_MAPPING: Record<string, string> = {
  // Old status -> New status
  'draft': 'pending_approval',
  'pending': 'pending_approval',
  'pending_optimization': 'approved',
  'proposed': 'approved',
  'confirmed': 'approved'
};

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Step 1: Get current status distribution
    const [currentStats] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);

    // Step 2: Update each old status
    const updates: Array<{ oldStatus: string; newStatus: string; count: number }> = [];
    let totalUpdated = 0;

    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAPPING)) {
      const [result]: any = await connection.query(
        `UPDATE trips SET status = ? WHERE status = ?`,
        [newStatus, oldStatus]
      );

      if (result.affectedRows > 0) {
        updates.push({
          oldStatus,
          newStatus,
          count: result.affectedRows
        });
        totalUpdated += result.affectedRows;
      }
    }

    // Step 3: Get new status distribution
    const [newStats] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM trips
      GROUP BY status
      ORDER BY count DESC
    `);

    // Step 4: Update ENUM to remove old values
    await connection.query(`
      ALTER TABLE trips
      MODIFY COLUMN status ENUM(
        'pending_approval',
        'pending_urgent',
        'auto_approved',
        'approved',
        'approved_solo',
        'optimized',
        'rejected',
        'cancelled',
        'expired'
      ) DEFAULT 'pending_approval'
    `);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${totalUpdated} trips to new status convention`,
      currentStats,
      updates,
      newStats
    });

  } catch (error: any) {
    console.error('Status migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate statuses' },
      { status: 500 }
    );
  }
}
