// app/api/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication using server-side auth
    const adminUser = await requireAdmin(request);

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { groupId } = body;

    console.log('Reject optimization request:', { groupId, adminUser: adminUser.id });

    if (!groupId) {
      console.error('Missing groupId in reject request');
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    console.log('Rejecting optimization group:', groupId);

    // Reject optimization
    await fabricService.rejectOptimization(groupId);

    console.log('Optimization rejected successfully:', groupId);

    return NextResponse.json({
      success: true,
      message: 'Optimization rejected successfully',
      groupId
    });
    
  } catch (error: any) {
    console.error('Reject optimization error:', error);
    console.error('Error stack:', error.stack);

    // Check for authorization errors
    if (error.message.includes('Unauthorized') ||
        error.message.includes('not authenticated') ||
        error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to reject optimization' },
      { status: 500 }
    );
  }
}