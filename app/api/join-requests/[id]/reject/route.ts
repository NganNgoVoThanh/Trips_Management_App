// app/api/join-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { joinRequestService } from '@/lib/join-request-service';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await context.params;

    console.log('Reject join request:', { id });

    // Require admin authentication
    const adminUser = await requireAdmin(request);

    console.log('Admin user:', { adminId: adminUser.id, adminEmail: adminUser.email });

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { adminNotes } = body;

    if (!adminNotes) {
      console.error('Missing admin notes in reject request');
      return NextResponse.json(
        { error: 'Admin notes are required for rejection' },
        { status: 400 }
      );
    }

    console.log('Rejecting join request with notes:', adminNotes.substring(0, 50) + '...');

    // Reject join request with admin user data
    await joinRequestService.rejectJoinRequest(
      id,
      adminNotes,
      {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        department: adminUser.department,
        employeeId: adminUser.employeeId
      }
    );

    console.log('Join request rejected successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Join request rejected successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error rejecting join request:', error);
    console.error('Error stack:', error.stack);

    // Check for authorization errors
    if (error.message.includes('Unauthorized') ||
        error.message.includes('not authenticated') ||
        error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to reject join request' },
      { status: 500 }
    );
  }
}