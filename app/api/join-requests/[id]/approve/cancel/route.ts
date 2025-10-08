// app/api/join-requests/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await joinRequestService.cancelJoinRequest(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Join request cancelled successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel join request' },
      { status: 500 }
    );
  }
}