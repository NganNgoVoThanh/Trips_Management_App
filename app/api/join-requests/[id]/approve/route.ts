// app/api/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { emailService } from '@/lib/email-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
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

    const { groupId } = await request.json();
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    console.log('✅ [APPROVE] Received groupId:', groupId);
    console.log('✅ [APPROVE] Admin:', user.email);

    // ✅ FIX: Get optimization group details
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      console.error('❌ [APPROVE] Group not found:', groupId);
      
      // 🔍 DEBUG: List all existing groups
      const allGroups = await fabricService.getOptimizationGroups();
      console.log('📋 [APPROVE] Available groups:', allGroups.map(g => g.id));
      
      return NextResponse.json(
        { 
          error: 'Optimization group not found',
          groupId,
          hint: 'This group may have been deleted or never created. Check console for available group IDs.'
        },
        { status: 404 }
      );
    }

    console.log('✅ [APPROVE] Found group:', group.id, 'with', group.trips?.length, 'trips');

    // Check if already approved/rejected
    if (group.status !== 'proposed') {
      console.warn('⚠️ [APPROVE] Group already processed:', group.status);
      return NextResponse.json(
        { error: `Optimization group is already ${group.status}` },
        { status: 400 }
      );
    }

    // Validate group has trips
    if (!group.trips || group.trips.length === 0) {
      console.error('❌ [APPROVE] Group has no trips');
      return NextResponse.json(
        { error: 'No trips found in optimization group' },
        { status: 400 }
      );
    }

    console.log('🔄 [APPROVE] Processing approval...');

    // Approve the optimization
    await fabricService.approveOptimization(groupId);
    
    console.log('✅ [APPROVE] Database updated successfully');

    // Get updated trips for email notification
    const finalTrips = await Promise.all(
      group.trips.map(tripId => fabricService.getTripById(tripId))
    );
    
    const validTrips = finalTrips.filter(t => t !== null);
    
    console.log('📧 [APPROVE] Sending notifications to', validTrips.length, 'users');

    // Send notification emails
    if (validTrips.length > 0 && emailService.isServiceConfigured()) {
      try {
        await emailService.sendOptimizationNotification(
          validTrips as any,
          group.proposedDepartureTime,
          group.vehicleType,
          group.estimatedSavings
        );
        console.log('✅ [APPROVE] Notifications sent');
      } catch (emailError) {
        console.error('⚠️ [APPROVE] Email failed:', emailError);
        // Don't fail the approval if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      groupId,
      message: `Optimization approved for ${validTrips.length} trips`,
      tripsUpdated: validTrips.length,
      notificationsSent: emailService.isServiceConfigured() && validTrips.length > 0,
      approvedBy: user.email,
      approvedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [APPROVE] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to approve optimization',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}