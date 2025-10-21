// app/api/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const user = await getServerUser(request);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { groupId } = body;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Validate group exists before rejection
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    // Reject the optimization (backend handles cleanup)
    await fabricService.rejectOptimization(groupId);
    
    return NextResponse.json({
      success: true,
      message: `Optimization ${groupId} rejected successfully`
    });
    
  } catch (error: any) {
    console.error('Error rejecting optimization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject optimization' },
      { status: 500 }
    );
  }
}