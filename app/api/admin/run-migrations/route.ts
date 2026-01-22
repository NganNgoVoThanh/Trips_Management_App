// app/api/admin/run-migrations/route.ts
// API endpoint to manually trigger database migrations
// Only accessible by super_admin

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { runDatabaseMigrations } from '@/lib/database-migration';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only super_admin can run migrations' },
        { status: 403 }
      );
    }

    console.log(`🔄 Running database migrations by ${session.user.email}`);

    // Run migrations
    await runDatabaseMigrations();

    return NextResponse.json({
      success: true,
      message: 'Database migrations completed successfully',
    });

  } catch (error: any) {
    console.error('❌ Error running migrations:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}
