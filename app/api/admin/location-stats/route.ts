// app/api/admin/location-stats/route.ts
// API endpoint for admin statistics (filtered by location for Location Admin)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { fabricService } from '@/lib/mysql-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    let stats;

    // If Location Admin, get location-specific stats
    if (session.user.adminType === 'location_admin' && session.user.adminLocationId) {
      stats = await fabricService.getStatsForLocationAdmin(session.user.adminLocationId);

      return NextResponse.json({
        statistics: stats,
        adminType: session.user.adminType,
        adminLocationId: session.user.adminLocationId,
        isFiltered: true,
      });
    }

    // Super Admin gets all stats
    const allTrips = await fabricService.getTrips({});

    const totalTrips = allTrips.length;
    const pendingApprovals = allTrips.filter(t =>
      t.status === 'pending_approval' || t.status === 'pending_urgent'
    ).length;
    const approvedTrips = allTrips.filter(t => t.status === 'approved').length;
    const optimizedTrips = allTrips.filter(t => t.status === 'optimized').length;

    // Calculate total savings from optimized trips
    const totalSavings = allTrips
      .filter(t => t.status === 'optimized' && t.actualCost)
      .reduce((sum, t) => sum + ((t.estimatedCost || 0) - (t.actualCost || 0)), 0);

    // Count unique active employees
    const activeEmployees = new Set(allTrips.map(t => t.userId)).size;

    return NextResponse.json({
      statistics: {
        totalTrips,
        pendingApprovals,
        approvedTrips,
        optimizedTrips,
        totalSavings: Math.round(totalSavings),
        activeEmployees,
      },
      adminType: session.user.adminType,
      adminLocationId: null,
      isFiltered: false,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/location-stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
