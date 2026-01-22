// app/api/trips/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { getServerUser } from '@/lib/server-auth'; // ✅ FIXED: Changed from getUserFromRequest

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const includeTemp = searchParams.get('includeTemp') === 'true';
    const optimizedGroupId = searchParams.get('optimizedGroupId');

    // If requesting temp trips by group ID, query temp_trips table directly
    if (includeTemp && optimizedGroupId) {
      const tempTrips = await fabricService.getTempTripsByGroupId(optimizedGroupId);
      return NextResponse.json(tempTrips);
    }

    const filters = {
      ...(userId && { userId }),
      ...(status && { status }),
      ...(optimizedGroupId && { optimizedGroupId })
    };

    const trips = await fabricService.getTrips(filters);
    return NextResponse.json(trips);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tripData = await request.json();
    
    // Validate user is authenticated
    const user = await getServerUser(request); // ✅ FIXED: Use getServerUser
    
    // Optional: Require authentication
    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    
    const trip = await fabricService.createTrip(tripData);
    return NextResponse.json(trip);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create trip' },
      { status: 500 }
    );
  }
}