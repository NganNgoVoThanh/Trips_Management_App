// app/api/admin/manage/statistics/route.ts
// API endpoints for admin statistics

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getAdminStatistics } from '@/lib/admin-service';

export const dynamic = 'force-dynamic';

// ========================================
// GET - Get admin statistics
// ========================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const statistics = await getAdminStatistics();
    return NextResponse.json({ statistics });
  } catch (error: any) {
    console.error('Error in GET /api/admin/manage/statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
