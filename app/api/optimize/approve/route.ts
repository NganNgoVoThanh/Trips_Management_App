// app/api/optimize/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { emailService } from '@/lib/email-service';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      groupId, 
      proposalId, 
      trips, 
      departureTime, 
      vehicleType, 
      estimatedSavings 
    } = body;
    
    const user = authService.getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Trường hợp 1: Chỉ có groupId
    if (groupId && !trips) {
      await fabricService.approveOptimization(groupId);
      return NextResponse.json({ success: true, groupId });
    }
    
    // Trường hợp 2: Có full data
    if (!trips || !Array.isArray(trips) || trips.length === 0) {
      return NextResponse.json(
        { error: 'Invalid trips data' },
        { status: 400 }
      );
    }
    
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
    
    await emailService.sendOptimizationNotification(
      trips,
      departureTime,
      vehicleType,
      estimatedSavings
    );
    
    return NextResponse.json({ success: true, groupId: group.id });
  } catch (error: any) {
    console.error('Approve optimization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve optimization' },
      { status: 500 }
    );
  }
}