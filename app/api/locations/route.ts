// app/api/locations/route.ts
// Public API to get location information

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    try {
      if (locationId) {
        // Get specific location
        const [rows] = await connection.query(
          'SELECT id, code, name, province, address, type, status FROM locations WHERE id = ? LIMIT 1',
          [locationId]
        ) as any[];

        if (rows.length === 0) {
          return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json({ location: rows[0] });
      }

      // Get all active locations
      const [rows] = await connection.query(
        `SELECT id, code, name, province, address, type, status
         FROM locations
         WHERE status = 'active'
         ORDER BY name`
      ) as any[];

      return NextResponse.json({ locations: rows });
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('Error in GET /api/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
