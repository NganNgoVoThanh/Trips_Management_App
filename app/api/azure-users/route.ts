// app/api/azure-users/route.ts
// API endpoint to get all users for admin dropdown

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';

// Mark this route as dynamic (not static)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin to access this endpoint
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const connection = await getConnection();

    try {
      // Get all users with profile completed
      const [users] = await connection.query<any[]>(
        `SELECT
          id,
          name,
          email,
          department,
          manager_email
        FROM users
        WHERE profile_completed = 1
        ORDER BY name ASC`
      );

      return NextResponse.json({
        users: users,
        count: users.length,
      });
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
