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
    const { 
      groupId, 
      proposalId, 
      trips, 
      departureTime, 
      vehicleType, 
      estimatedSavings 
    } = body;
    
    // Case 1: Only groupId provided (approve existing optimization)
    if (groupId && !trips) {
      await fabricService.approveOptimization(groupId);
      return NextResponse.json({ success: true, groupId });
    }
    
    // Case 2: Full data provided (create new optimization)
    if (!trips || !Array.isArray(trips) || trips.length === 0) {
      return NextResponse.json(
        { error: 'Invalid trips data' },
        { status: 400 }
      );
    }
    
    // Create optimization group
    const group = await fabricService.createOptimizationGroup({
      trips: trips.map((t: any) => t.id),
      proposedDepartureTime: departureTime,
      vehicleType,
      estimatedSavings,
      status: 'approved',
      createdBy: adminUser.id,
      approvedBy: adminUser.id,
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
    
    // Send notification emails
    await emailService.sendOptimizationNotification(
      trips,
      departureTime,
      vehicleType,
      estimatedSavings
    );
    
    return NextResponse.json({ success: true, groupId: group.id });
    
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