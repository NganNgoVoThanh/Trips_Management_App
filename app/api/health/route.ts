// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { fabricService } from '@/lib/supabase-service';

export async function GET() {
  try {
    // Check basic health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'unknown',
        authentication: 'ready',
        optimization: 'ready'
      }
    };

    // Try to check database connection
    try {
      const trips = await fabricService.getTrips();
      health.services.database = 'connected';
    } catch (error) {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 503 }
    );
  }
}
