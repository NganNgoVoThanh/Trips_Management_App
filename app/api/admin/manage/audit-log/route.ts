// app/api/admin/manage/audit-log/route.ts
// API endpoints for admin audit log

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getAdminAuditLog } from '@/lib/admin-service';

export const dynamic = 'force-dynamic';

// ========================================
// GET - Get audit log
// ========================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can view audit log
    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const targetUserEmail = searchParams.get('targetUserEmail') || undefined;
    const performedByEmail = searchParams.get('performedByEmail') || undefined;

    const result = await getAdminAuditLog({
      limit,
      offset,
      targetUserEmail,
      performedByEmail,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/admin/manage/audit-log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
