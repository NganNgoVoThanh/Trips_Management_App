// app/api/optimize/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { emailService } from '@/lib/email-service';
import { getServerUser } from '@/lib/server-auth';
import { TripStatus } from '@/lib/trip-status-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getServerUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { groupId } = body;
    
    // ✅ FIX: Validate groupId is provided
    if (!groupId) {
      console.error('Rejection failed: No groupId in request body:', body);
      return NextResponse.json(
        { error: 'Group ID is required for rejection' },
        { status: 400 }
      );
    }

    console.log(`Admin ${user.email} is rejecting optimization group: ${groupId}`);

    // ✅ FIX: Get optimization group details first
    const group = await fabricService.getOptimizationGroupById(groupId);
    
    if (!group) {
      console.error(`Optimization group not found: ${groupId}`);
      return NextResponse.json(
        { error: 'Optimization group not found' },
        { status: 404 }
      );
    }

    // Check if already approved/rejected
    if (group.status !== 'proposed') {
      return NextResponse.json(
        { error: `Optimization group is already ${group.status}` },
        { status: 400 }
      );
    }

    // Get temp trips count before deletion
    const tempTrips = await fabricService.getTempTripsByGroupId(groupId);
    const tempCount = tempTrips.length;

    console.log(`⛔ Admin rejecting optimization group ${groupId} with ${tempCount} temp trips`);

    // Reject the optimization (backend handles TEMP deletion, RAW preservation)
    await fabricService.rejectOptimization(groupId);

    // Update RAW trips back to 'approved_solo' status
    // (fabricService.rejectOptimization should handle this, but let's be explicit)
    const rawTrips = await fabricService.getTrips({
      optimizedGroupId: groupId,
      dataType: 'raw'
    });

    for (const trip of rawTrips) {
      await fabricService.updateTrip(trip.id, {
        status: 'approved_solo' as TripStatus,
        optimizedGroupId: undefined
      });
    }

    console.log(`✓ Reverted ${rawTrips.length} trips to 'approved_solo' status`);

    // Send notification emails to affected users about rejection
    if (rawTrips.length > 0 && emailService.isServiceConfigured()) {
      try {
        const userEmails = [...new Set(rawTrips.map(t => t.userEmail).filter(Boolean))];

        for (const email of userEmails) {
          const userTrips = rawTrips.filter(t => t.userEmail === email);

          await emailService.sendEmail({
            to: email,
            subject: 'Trip Optimization Update - Reverted to Individual Trip',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Trip Optimization Update</h1>
  </div>

  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Hello,</p>

    <p>The proposed trip optimization that included your trip(s) has been <strong>cancelled</strong> by the administrator.</p>

    <div style="background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0;"><strong>What this means:</strong></p>
      <p style="margin: 5px 0 0 0;">Your trip(s) will proceed as <strong>individual trips</strong> instead of being combined with other travelers.</p>
    </div>

    <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151;">Your Affected Trip(s):</h3>
      ${userTrips.map(trip => `
        <div style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
          <p style="margin: 0;"><strong>${trip.departureLocation}</strong> → <strong>${trip.destination}</strong></p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
            Date: ${trip.departureDate} | Status: Approved (Individual)
          </p>
        </div>
      `).join('')}
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you have any questions, please contact the Admin team.
    </p>
  </div>

  <div style="background: #1f2937; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      Intersnack Trips Management System
    </p>
  </div>
</body>
</html>
            `,
            text: `Your trip optimization has been cancelled. Your trip(s) will proceed as individual trips.`
          });
        }

        console.log(`✓ Sent rejection notifications to ${userEmails.length} users`);
      } catch (emailError) {
        console.error('Failed to send rejection notifications:', emailError);
        // Don't fail the rejection if email fails
      }
    }

    return NextResponse.json({
      success: true,
      groupId,
      message: `Optimization rejected. ${tempCount} temporary records deleted, ${rawTrips.length} original trips reverted to individual status`,
      tempDataDeleted: tempCount,
      rawTripsReverted: rawTrips.length,
      newStatus: 'approved_solo',
      rejectedBy: user.email,
      rejectedAt: new Date().toISOString(),
      notificationsSent: rawTrips.length > 0 && emailService.isServiceConfigured()
    });
    
  } catch (error: any) {
    console.error('Error rejecting optimization:', error);
    
    // Check for specific error types
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to reject optimization' },
      { status: 500 }
    );
  }
}