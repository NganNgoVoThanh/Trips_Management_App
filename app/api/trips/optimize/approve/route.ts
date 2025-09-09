// app/api/trips/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/supabase-service';
import { emailService } from '@/lib/email-service';
import { authService } from '@/lib/auth-service';

// Approve optimization and replace RAW with FINAL
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
    
    // Get optimization group
    const group = await fabricService.getOptimizationGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }
    
    // Approve optimization - this replaces RAW with FINAL
    await fabricService.approveOptimization(groupId);
    
    // Get updated trips for notification
    const finalTrips = await Promise.all(
      group.trips.map(id => fabricService.getTripById(id))
    );
    
    // Send notifications
    const validTrips = finalTrips.filter(t => t !== null);
    if (validTrips.length > 0) {
      await emailService.sendOptimizationNotification(
        validTrips as any,
        group.proposedDepartureTime,
        group.vehicleType,
        group.estimatedSavings
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Optimization approved. ${group.trips.length} RAW trips replaced with FINAL data`,
      groupId,
      tripsUpdated: group.trips.length,
      dataReplaced: true,
      tempDataDeleted: true
    });
    
  } catch (error: any) {
    console.error('Error approving optimization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}
