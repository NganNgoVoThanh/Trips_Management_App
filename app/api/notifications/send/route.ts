import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';
import { fabricService } from '@/lib/mysql-service';

export async function POST(request: NextRequest) {
  try {
    const { tripId, type } = await request.json();

    console.log(`📧 Sending notification for trip ${tripId}, type: ${type}`);

    // Get trip by ID
    const trips = await fabricService.getTrips({});
    const tripData = trips.find((t: any) => t.id === tripId);

    if (!tripData) {
      console.error(`❌ Trip not found: ${tripId}`);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found trip for user: ${tripData.userEmail}`);

    // Send appropriate notification based on type
    switch (type) {
      case 'confirmation':
        await emailService.sendTripConfirmation(tripData);
        console.log(`✅ Trip confirmation sent to ${tripData.userEmail}`);
        break;
      case 'approval':
        await emailService.sendApprovalNotification(tripData);
        console.log(`✅ Approval notification sent to ${tripData.userEmail}`);
        break;
      case 'cancellation':
        await emailService.sendCancellationNotification(tripData);
        console.log(`✅ Cancellation notification sent to ${tripData.userEmail}`);
        break;
      default:
        throw new Error(`Invalid notification type: ${type}`);
    }

    // Update trip as notified
    await fabricService.updateTrip(tripId, { notified: true });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${tripData.userEmail}`,
      tripId,
      type
    });
  } catch (error: any) {
    console.error('❌ Failed to send notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
