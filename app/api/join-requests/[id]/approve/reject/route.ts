// app/api/join-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminNotes } = await request.json();
    
    if (!adminNotes) {
      return NextResponse.json(
        { error: 'Admin notes are required for rejection' },
        { status: 400 }
      );
    }
    
    await joinRequestService.rejectJoinRequest(params.id, adminNotes);
    
    return NextResponse.json({
      success: true,
      message: 'Join request rejected successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reject join request' },
      { status: 500 }
    );
  }
}