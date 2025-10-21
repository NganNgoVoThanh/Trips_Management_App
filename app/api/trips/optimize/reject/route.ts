// app/api/trips/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { authService } from '@/lib/auth-service';

// Reject optimization and delete TEMP data only
export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json();
    
    // Check admin permission
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    // Get temp trips count before deletion
    const tempTrips = await fabricService.getTempTripsByGroupId(groupId);
    const tempCount = tempTrips.length;
    
    // Reject optimization - this deletes TEMP and keeps RAW
    await fabricService.rejectOptimization(groupId);
    
    return NextResponse.json({
      success: true,
      message: `Optimization rejected. ${tempCount} TEMP records deleted, RAW data preserved`,
      groupId,
      tempDataDeleted: tempCount,
      rawDataPreserved: true
    });
    
  } catch (error: any) {
    console.error('Error rejecting optimization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject optimization' },
      { status: 500 }
    );
  }
}