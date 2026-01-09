// app/api/init/migrate/route.ts
// Endpoint to run database migrations manually
// Usage: GET /api/init/migrate?token=init-intersnack-2025

import { NextRequest, NextResponse } from 'next/server';
import { runDatabaseMigrations } from '@/lib/database-migration';

// Mark as dynamic route to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for init token in query params for security
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // Simple security check - in production use proper auth
    if (token !== 'init-intersnack-2025') {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    console.log('🔧 Running database migrations...');

    await runDatabaseMigrations();

    return NextResponse.json({
      success: true,
      message: 'All database migrations completed successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
