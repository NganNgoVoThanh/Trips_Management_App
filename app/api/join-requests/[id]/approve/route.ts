// app/api/join-requests/[id]/approve/route.ts
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

    // Require admin authentication
    const adminUser = await requireAdmin(request);
    
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { adminNotes } = body;
    
    // Approve join request with admin user data
    await joinRequestService.approveJoinRequest(
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
    
    return NextResponse.json({ 
      success: true,
      message: 'Join request approved successfully' 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error approving join request:', error);
    
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
      { error: error.message || 'Failed to approve join request' },
      { status: 500 }
    );
  }
}