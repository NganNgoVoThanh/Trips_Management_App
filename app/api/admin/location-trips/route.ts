// app/api/admin/location-trips/route.ts
// API endpoint for Location Admin to get trips filtered by their location

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { fabricService } from '@/lib/mysql-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const searchTerm = searchParams.get('search') || undefined;
    const departureDate = searchParams.get('date') || undefined;

    let trips;

    // If Location Admin, filter by their assigned location
    if (session.user.adminType === 'location_admin' && session.user.adminLocationId) {
      trips = await fabricService.getTripsForLocationAdmin(
        session.user.adminLocationId,
        { status, searchTerm, departureDate }
      );
    } else {
      // Super Admin can see all trips
      const filters: any = {};
      if (status && status !== 'all') {
        filters.status = status;
      }
      if (departureDate) {
        filters.departureDate = departureDate;
      }
      trips = await fabricService.getTrips(filters);
    }

    return NextResponse.json({
      trips,
      adminType: session.user.adminType,
      adminLocationId: session.user.adminLocationId || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/location-trips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
