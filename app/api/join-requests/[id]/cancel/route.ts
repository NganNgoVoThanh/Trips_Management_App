// app/api/join-requests/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { requireAuth } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await context.params;

    console.log('Cancel join request:', { id });

    // Require user authentication
    const user = await requireAuth(request);

    console.log('User cancelling request:', { userId: user.id, userEmail: user.email });

    // Cancel join request with user data
    await joinRequestService.cancelJoinRequest(
      id,
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    );

    console.log('Join request cancelled successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Join request cancelled successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error cancelling join request:', error);
    console.error('Error stack:', error.stack);

    // Check for authorization errors
    if (error.message.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (error.message.includes('only cancel your own')) {
      return NextResponse.json(
        { error: 'You can only cancel your own requests' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to cancel join request' },
      { status: 500 }
    );
  }
}