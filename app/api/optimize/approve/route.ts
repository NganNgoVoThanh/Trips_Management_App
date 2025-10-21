// app/api/optimize/approve/route.ts
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

    // ✅ FIX: Get trips data before approval
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    // ✅ FIX: Check if trips exist
    if (!group.trips || group.trips.length === 0) {
      return NextResponse.json(
        { error: 'No trips found in optimization group' },
        { status: 400 }
      );
    }

    // Approve the optimization (backend handles conversion)
    await fabricService.approveOptimization(groupId);
    
    return NextResponse.json({
      success: true,
      message: `Optimization ${groupId} approved successfully`
    });
    
  } catch (error: any) {
    console.error('Error approving optimization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}