// app/api/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/fabric-service';
import { emailService } from '@/lib/email-service';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const { proposalId, trips, departureTime, vehicleType, estimatedSavings } = await request.json();
    
    // Get current user (admin)
    const user = authService.getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Create optimization group
    const group = await fabricService.createOptimizationGroup({
      trips: trips.map((t: any) => t.id),
      proposedDepartureTime: departureTime,
      vehicleType,
      estimatedSavings,
      status: 'approved',
      createdBy: user.id,
      approvedBy: user.id,
      approvedAt: new Date().toISOString()
    });
    
    // Update trips
    for (const trip of trips) {
      await fabricService.updateTrip(trip.id, {
        status: 'optimized',
        optimizedGroupId: group.id,
        originalDepartureTime: trip.departureTime,
        departureTime,
        vehicleType,
        notified: true
      });
    }
    
    // Send notifications
    await emailService.sendOptimizationNotification(
      trips,
      departureTime,
      vehicleType,
      estimatedSavings
    );
    
    return NextResponse.json({ success: true, groupId: group.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}