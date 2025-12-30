// app/api/admin/manage/locations/route.ts
// API endpoints for location management

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getAllLocations, getLocationById } from '@/lib/admin-service';

export const dynamic = 'force-dynamic';

// ========================================
// GET - Get all locations or specific location
// ========================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' || session.user.adminType !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('id');

    if (locationId) {
      const location = await getLocationById(locationId);
      if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      }
      return NextResponse.json({ location });
    }

    const locations = await getAllLocations();
    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error('Error in GET /api/admin/manage/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
