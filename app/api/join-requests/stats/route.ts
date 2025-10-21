// app/api/join-requests/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { getServerUser } from '@/lib/server-auth';

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

    // Get join request statistics
    const stats = await joinRequestService.getJoinRequestStats();

    return NextResponse.json(stats, { status: 200 });
    
  } catch (error: any) {
    console.error('Error fetching join request stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}