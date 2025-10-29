// app/api/debug/trips/route.ts - DEBUG ONLY
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get all trips for this user
    const allTrips = await fabricService.getTrips({ userId });

    // Get details
    const tripsWithDetails = allTrips.map(trip => ({
      id: trip.id,
      userId: trip.userId,
      userName: trip.userName,
      userEmail: trip.userEmail,
      departureLocation: trip.departureLocation,
      destination: trip.destination,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      status: trip.status,
      optimizedGroupId: trip.optimizedGroupId,
      parentTripId: trip.parentTripId,
      dataType: trip.dataType,
      createdAt: trip.createdAt
    }));

    return NextResponse.json({
      userId,
      totalTrips: allTrips.length,
      trips: tripsWithDetails
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
