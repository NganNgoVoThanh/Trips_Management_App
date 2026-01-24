// app/api/join-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { getServerUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch join requests with filters
export async function GET(request: NextRequest) {
  try {
    // Extract user from server-side auth
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const requesterId = searchParams.get('requesterId');
    const status = searchParams.get('status');

    // Build filters
    const filters: any = {};
    if (tripId) filters.tripId = tripId;
    if (requesterId) filters.requesterId = requesterId;
    if (status) filters.status = status;

    // Check if user is Location Admin - add location filter
    if (user.adminType === 'location_admin' && user.adminLocationId) {
      filters.locationId = user.adminLocationId;
    }

    // Fetch join requests
    const requests = await joinRequestService.getJoinRequests(filters);

    return NextResponse.json(requests, { status: 200 });
    
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

// POST: Create new join request
export async function POST(request: NextRequest) {
  try {
    // Extract user from server-side auth
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { tripId, tripDetails, reason } = body;
    
    if (!tripId || !tripDetails) {
      return NextResponse.json(
        { error: 'Trip ID and trip details are required' },
        { status: 400 }
      );
    }
    
    // Create join request with server-side user data
    const joinRequest = await joinRequestService.createJoinRequest(
      tripId,
      tripDetails,
      reason,
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    );
    
    return NextResponse.json(joinRequest, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create join request' },
      { status: 500 }
    );
  }
}