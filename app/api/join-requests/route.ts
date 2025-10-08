// app/api/join-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { authService } from '@/lib/auth-service';

// GET: Get all join requests with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tripId = searchParams.get('tripId');
    const requesterId = searchParams.get('requesterId');
    const status = searchParams.get('status');
    
    const filters: any = {};
    if (tripId) filters.tripId = tripId;
    if (requesterId) filters.requesterId = requesterId;
    if (status) filters.status = status;
    
    const joinRequests = await joinRequestService.getJoinRequests(filters);
    return NextResponse.json(joinRequests);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

// POST: Create new join request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, tripDetails, reason } = body;
    
    if (!tripId || !tripDetails) {
      return NextResponse.json(
        { error: 'Trip ID and trip details are required' },
        { status: 400 }
      );
    }
    
    const joinRequest = await joinRequestService.createJoinRequest(
      tripId,
      tripDetails,
      reason
    );
    
    return NextResponse.json(joinRequest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create join request' },
      { status: 500 }
    );
  }
}

// DELETE: Clear all join requests (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    await joinRequestService.clearAllJoinRequests();
    
    return NextResponse.json({
      success: true,
      message: 'All join requests cleared'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to clear join requests' },
      { status: 500 }
    );
  }
}