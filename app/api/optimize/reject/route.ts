// app/api/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { groupId } = body;
    
    // ✅ FIX: Validate groupId is provided
    if (!groupId) {
      console.error('Rejection failed: No groupId in request body:', body);
      return NextResponse.json(
        { error: 'Group ID is required for rejection' },
        { status: 400 }
      );
    }

    console.log(`Admin ${user.email} is rejecting optimization group: ${groupId}`);

    // ✅ FIX: Get optimization group details first
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      console.error(`Optimization group not found: ${groupId}`);
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    // Check if already approved/rejected
    if (group.status !== 'proposed') {
      return NextResponse.json(
        { error: `Optimization group is already ${group.status}` },
        { status: 400 }
      );
    }

    // Get temp trips count before deletion
    const tempTrips = await fabricService.getTempTripsByGroupId(groupId);
    const tempCount = tempTrips.length;
    
    console.log(`Rejecting group ${groupId} with ${tempCount} temp trips`);

    // Reject the optimization (backend handles TEMP deletion, RAW preservation)
    await fabricService.rejectOptimization(groupId);
    
    return NextResponse.json({
      success: true,
      groupId,
      message: `Optimization rejected. ${tempCount} temporary records deleted, original trips preserved`,
      tempDataDeleted: tempCount,
      rawDataPreserved: true,
      rejectedBy: user.email,
      rejectedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error rejecting optimization:', error);
    
    // Check for specific error types
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('Admin access required')) {
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