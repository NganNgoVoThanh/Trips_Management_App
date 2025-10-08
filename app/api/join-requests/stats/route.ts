// app/api/join-requests/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';

export async function GET(request: NextRequest) {
  try {
    const stats = await joinRequestService.getJoinRequestStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch join request stats' },
      { status: 500 }
    );
  }
}