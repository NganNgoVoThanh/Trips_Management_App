// app/api/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { emailService } from '@/lib/email-service';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication using server-side auth
    const adminUser = await requireAdmin(request);
    
    // Parse request body
    const body = await request.json();
    const { groupId } = body;
    
    // ✅ FIX: Only need groupId, get trips from optimization group
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    // Get optimization group to get trip IDs
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }
    
    // Approve optimization (converts TEMP → FINAL, updates RAW trips)
    await fabricService.approveOptimization(groupId);
    
    // Get final trips for notification
    const finalTrips = await Promise.all(
      group.trips.map(tripId => fabricService.getTripById(tripId))
    );
    
    const validTrips = finalTrips.filter(t => t !== null);
    
    // Send notification emails
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
      groupId,
      message: `Optimization approved for ${validTrips.length} trips`
    });
    
  } catch (error: any) {
    console.error('Approve optimization error:', error);
    
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
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}