// app/api/admin/manual-override/badge-count/route.ts
// Lightweight endpoint to get count of trips needing manual override (for badge display)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check authentication and admin role
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { count: 0 },
      { status: 200 } // Return 0 for non-admin instead of error
    );
  }

  // Determine if user is Location Admin
  const isLocationAdmin = session.user.adminType === 'location_admin' && session.user.adminLocationId;
  const adminLocationId = session.user.adminLocationId;

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // For Location Admin, get location name for matching
    let locationName = adminLocationId;
    if (isLocationAdmin && adminLocationId) {
      const [locRows] = await connection.query(
        'SELECT name FROM locations WHERE id = ? LIMIT 1',
        [adminLocationId]
      ) as any[];
      if (locRows.length > 0) {
        locationName = locRows[0].name;
      }
    }

    // Build location filter for Location Admin
    let locationFilter = '';
    let locationParams: any[] = [];
    if (isLocationAdmin && adminLocationId) {
      locationFilter = `AND (departure_location = ? OR departure_location = ? OR destination = ? OR destination = ?)`;
      locationParams = [adminLocationId, locationName, adminLocationId, locationName];
    }

    // Get count of trips needing manual override
    const [result] = await connection.query(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN is_urgent = 1 OR status = 'pending_urgent' THEN 1 ELSE 0 END) as urgent_count
      FROM trips
      WHERE manager_approval_status = 'pending'
        AND status IN ('pending_approval', 'pending_urgent')
        AND (
          TIMESTAMPDIFF(HOUR, created_at, NOW()) > 48
          OR is_urgent = 1
          OR status = 'pending_urgent'
        )
        ${locationFilter}
    `, locationParams) as any[];

    const data = result[0] || { total_count: 0, urgent_count: 0 };

    return NextResponse.json({
      success: true,
      count: parseInt(data.total_count) || 0,
      urgentCount: parseInt(data.urgent_count) || 0,
    });
  } catch (error: any) {
    console.error('❌ Error fetching badge count:', error);
    // Return 0 on error instead of failing
    return NextResponse.json({
      success: false,
      count: 0,
      urgentCount: 0,
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
