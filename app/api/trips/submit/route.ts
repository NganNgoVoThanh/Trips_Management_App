// app/api/trips/submit/route.ts
// Enhanced trip submission with email approval workflow

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getUserByEmail } from '@/lib/user-service';
import { fabricService } from '@/lib/mysql-service';
import {
  sendApprovalEmail,
  sendUrgentAlertToAdmin,
  ApprovalEmailData,
} from '@/lib/email-approval-service';
import { logApprovalAction } from '@/lib/audit-log-service';

interface TripSubmissionData {
  departureLocation: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  purpose?: string;
  vehicleType?: string;
  estimatedCost?: number;
  ccEmails?: string[]; // CC recipients for approval email
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email!;
    const user = await getUserByEmail(userEmail);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if profile completed
    if (!user.profile_completed) {
      return NextResponse.json(
        { error: 'Please complete your profile first' },
        { status: 400 }
      );
    }

    // Check if manager confirmed (if user has a manager)
    if (user.pending_manager_email && !user.manager_confirmed) {
      return NextResponse.json(
        {
          error: 'Manager confirmation pending',
          message: 'Your manager has not confirmed yet. Please wait for their confirmation before submitting trips.',
          pendingManagerEmail: user.pending_manager_email
        },
        { status: 403 }
      );
    }

    // Get trip data
    const tripData: TripSubmissionData = await request.json();

    // Validate required fields
    if (
      !tripData.departureLocation ||
      !tripData.destination ||
      !tripData.departureDate ||
      !tripData.departureTime ||
      !tripData.returnDate ||
      !tripData.returnTime
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate if urgent (< 24 hours)
    const departureDateTime = new Date(`${tripData.departureDate}T${tripData.departureTime}`);
    const now = new Date();
    const hoursUntilDeparture = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isUrgent = hoursUntilDeparture < 24;

    // Check for auto-approve scenarios
    let autoApproved = false;
    let approvalStatus: 'pending' | 'approved' = 'pending';
    let tripStatus: 'pending' | 'approved' = 'pending';

    // Exception Case 1: No manager (CEO/Founder) → Auto-approve
    if (!user.manager_email || !user.manager_name) {
      console.log(`🔓 Auto-approving trip for user without manager: ${userEmail}`);
      autoApproved = true;
      approvalStatus = 'approved';
      tripStatus = 'approved';
    }

    // Create trip in database
    const trip = await fabricService.createTrip({
      userId: user.id,
      userName: user.name || userEmail.split('@')[0],
      userEmail: userEmail,
      departureLocation: tripData.departureLocation,
      destination: tripData.destination,
      departureDate: tripData.departureDate,
      departureTime: tripData.departureTime,
      returnDate: tripData.returnDate,
      returnTime: tripData.returnTime,
      status: tripStatus,
      vehicleType: tripData.vehicleType,
      estimatedCost: tripData.estimatedCost,
      notified: false,
      dataType: 'raw',
    });

    // Update trip with email approval fields
    await fabricService.updateTrip(trip.id, {
      manager_approval_status: approvalStatus,
      cc_emails: JSON.stringify(tripData.ccEmails || []),
      is_urgent: isUrgent,
      auto_approved: autoApproved,
    });

    console.log(`📝 Trip created: ${trip.id} | Auto-approved: ${autoApproved} | Urgent: ${isUrgent}`);

    // Log trip submission to audit trail
    await logApprovalAction({
      tripId: trip.id,
      action: 'submit',
      actorEmail: userEmail,
      actorName: user.name || userEmail.split('@')[0],
      actorRole: 'user',
      newStatus: autoApproved ? 'approved' : 'pending',
      notes: autoApproved
        ? 'Trip auto-approved (no manager assigned)'
        : isUrgent
        ? `Trip submitted - URGENT (< 24h). Email sent to manager: ${user.manager_email}`
        : `Trip submitted. Email sent to manager: ${user.manager_email}`,
    });

    // Send approval email if has manager
    if (!autoApproved && user.manager_email && user.manager_name) {
      const emailData: ApprovalEmailData = {
        tripId: trip.id,
        userName: user.name || userEmail.split('@')[0],
        userEmail: userEmail,
        managerEmail: user.manager_email,
        managerName: user.manager_name,
        ccEmails: tripData.ccEmails || [],
        tripDetails: {
          departureLocation: tripData.departureLocation,
          destination: tripData.destination,
          departureDate: tripData.departureDate,
          departureTime: tripData.departureTime,
          returnDate: tripData.returnDate,
          returnTime: tripData.returnTime,
          purpose: tripData.purpose,
        },
        isUrgent,
      };

      const emailSent = await sendApprovalEmail(emailData);

      if (!emailSent) {
        console.warn(`⚠️ Failed to send approval email for trip ${trip.id}`);
      }

      // If urgent, alert admin
      if (isUrgent) {
        await sendUrgentAlertToAdmin(emailData);
      }
    }

    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        status: tripStatus,
        autoApproved,
        isUrgent,
        requiresApproval: !autoApproved,
      },
      message: autoApproved
        ? 'Trip auto-approved (no manager assigned)'
        : isUrgent
        ? 'Trip submitted. Urgent approval request sent to manager and admin.'
        : 'Trip submitted. Approval request sent to manager.',
    });
  } catch (error: any) {
    console.error('❌ Error submitting trip:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit trip',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
