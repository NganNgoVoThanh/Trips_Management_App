// app/api/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { emailService } from '@/lib/email-service';
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
      console.error('Approval failed: No groupId in request body:', body);
      return NextResponse.json(
        { error: 'Group ID is required for approval' },
        { status: 400 }
      );
    }

    console.log(`Admin ${user.email} is approving optimization group: ${groupId}`);

    // ✅ FIX: Get optimization group details first
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      console.error(`Optimization group not found: ${groupId}`);
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    // ✅ FIX: Validate group has trips
    if (!group.trips || group.trips.length === 0) {
      console.error(`Optimization group ${groupId} has no trips`);
      return NextResponse.json(
        { error: 'No trips found in optimization group' },
        { status: 400 }
      );
    }

    // Check if already approved/rejected
    if (group.status !== 'proposed') {
      return NextResponse.json(
        { error: `Optimization group is already ${group.status}` },
        { status: 400 }
      );
    }

    console.log(`Approving ${group.trips.length} trips in group ${groupId}`);

    // Approve the optimization (backend handles TEMP → FINAL conversion)
    await fabricService.approveOptimization(groupId);
    
    // Get updated trips for email notification
    const finalTrips = await Promise.all(
      group.trips.map(tripId => fabricService.getTripById(tripId))
    );
    
    const validTrips = finalTrips.filter(t => t !== null);
    
    // Send notification emails to affected users
    if (validTrips.length > 0 && emailService.isServiceConfigured()) {
      try {
        await emailService.sendOptimizationNotification(
          validTrips as any,
          group.proposedDepartureTime,
          group.vehicleType,
          group.estimatedSavings
        );
        console.log(`Notifications sent for ${validTrips.length} trips`);
      } catch (emailError) {
        console.error('Failed to send notifications:', emailError);
        // Don't fail the approval if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      groupId,
      message: `Optimization approved for ${validTrips.length} trips`,
      notificationsSent: emailService.isServiceConfigured() && validTrips.length > 0,
      approvedBy: user.email,
      approvedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error approving optimization:', error);
    
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
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}