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
    const body = await request.json().catch(() => ({}));
    const {
      groupId,
      proposalId,
      trips,
      departureTime,
      vehicleType,
      estimatedSavings
    } = body;

    console.log('Approve optimization request:', {
      groupId,
      proposalId,
      hasTrips: !!trips,
      tripsCount: Array.isArray(trips) ? trips.length : 'not array',
      departureTime,
      vehicleType
    });

    // Case 1: Only groupId provided (approve existing optimization)
    if (groupId && !trips) {
      console.log('Approving existing optimization group:', groupId);
      await fabricService.approveOptimization(groupId);
      return NextResponse.json({ success: true, groupId });
    }

    // Case 2: Full data provided (create new optimization)
    // Validate trips data
    if (!trips) {
      return NextResponse.json(
        { error: 'Missing trips data. Please provide trips array.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(trips)) {
      return NextResponse.json(
        { error: 'Invalid trips data. Expected array but got ' + typeof trips },
        { status: 400 }
      );
    }

    if (trips.length === 0) {
      return NextResponse.json(
        { error: 'Empty trips array. At least one trip is required.' },
        { status: 400 }
      );
    }

    // Validate each trip has required fields
    const invalidTrips = trips.filter((t: any) => !t || !t.id);
    if (invalidTrips.length > 0) {
      return NextResponse.json(
        { error: `Invalid trip data: ${invalidTrips.length} trip(s) missing required 'id' field` },
        { status: 400 }
      );
    }

    // Validate other required fields
    if (!departureTime) {
      return NextResponse.json(
        { error: 'Missing departureTime' },
        { status: 400 }
      );
    }

    if (!vehicleType) {
      return NextResponse.json(
        { error: 'Missing vehicleType' },
        { status: 400 }
      );
    }
    
    console.log('Creating new optimization group with', trips.length, 'trips');

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

    console.log('Created optimization group:', group.id);

    // Update trips
    for (const trip of trips) {
      console.log('Updating trip:', trip.id);
      await fabricService.updateTrip(trip.id, {
        status: 'optimized',
        optimizedGroupId: group.id,
        originalDepartureTime: trip.departureTime,
        departureTime,
        vehicleType,
        notified: true
      });
    }

    console.log('Sending notification emails to', trips.length, 'users');

    // Send notification emails
    await emailService.sendOptimizationNotification(
      trips,
      departureTime,
      vehicleType,
      estimatedSavings
    );

    console.log('Optimization approval completed successfully');

    return NextResponse.json({ success: true, groupId: group.id });
    
  } catch (error: any) {
    console.error('Approve optimization error:', error);
    console.error('Error stack:', error.stack);

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