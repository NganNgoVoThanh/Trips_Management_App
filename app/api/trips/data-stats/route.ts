// app/api/trips/data-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { getServerUser } from '@/lib/server-auth'; // ✅ FIXED: Changed from getUserFromRequest

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Optional: Check authentication
    // const user = await getServerUser(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const stats = await fabricService.getDataStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching data stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data stats' },
      { status: 500 }
    );
  }
}