// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { fabricService } from '@/lib/mysql-service';
import { joinRequestService } from '@/lib/join-request-service';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: { status: 'unknown', details: null as any },
      authentication: { status: 'ready' },
      optimization: { status: 'unknown', details: null as any }
    },
    checks: {} as any,
    environment: {
      DB_HOST: process.env.DB_HOST || 'NOT_SET',
      DB_PORT: process.env.DB_PORT || 'NOT_SET',
      DB_USER: process.env.DB_USER || 'NOT_SET',
      DB_NAME: process.env.DB_NAME || 'NOT_SET',
      DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : 'NOT_SET'
    }
  };

  let hasErrors = false;

  // 1. Check MySQL Service Configuration
  try {
    health.checks.mysqlServiceConfigured = fabricService.isServiceConfigured();
    health.checks.mysqlDatabaseConnected = fabricService.isDatabaseConnected();
  } catch (error: any) {
    health.checks.mysqlServiceConfigured = false;
    health.checks.mysqlError = error.message;
    hasErrors = true;
  }

  // 2. Test Database - getTrips
  try {
    const trips = await fabricService.getTrips();
    health.services.database = {
      status: 'connected',
      details: {
        tripCount: trips.length,
        method: 'getTrips',
        success: true
      }
    };
    health.checks.getTrips = {
      success: true,
      count: trips.length
    };
  } catch (error: any) {
    health.services.database = {
      status: 'disconnected',
      details: {
        error: error.message,
        method: 'getTrips',
        success: false
      }
    };
    health.checks.getTrips = {
      success: false,
      error: error.message
    };
    hasErrors = true;
  }

  // 3. Test Optimization Groups
  try {
    const groups = await fabricService.getOptimizationGroups();
    health.services.optimization = {
      status: 'connected',
      details: {
        groupCount: groups.length,
        method: 'getOptimizationGroups',
        success: true
      }
    };
    health.checks.getOptimizationGroups = {
      success: true,
      count: groups.length
    };
  } catch (error: any) {
    health.services.optimization = {
      status: 'disconnected',
      details: {
        error: error.message,
        method: 'getOptimizationGroups',
        success: false
      }
    };
    health.checks.getOptimizationGroups = {
      success: false,
      error: error.message
    };
    hasErrors = true;
  }

  // 4. Test Join Request Stats
  try {
    const stats = await joinRequestService.getJoinRequestStats();
    health.checks.getJoinRequestStats = {
      success: true,
      stats
    };
  } catch (error: any) {
    health.checks.getJoinRequestStats = {
      success: false,
      error: error.message
    };
    hasErrors = true;
  }

  // 5. Set overall status
  if (hasErrors) {
    health.status = 'degraded';
  }

  // 6. Check critical failures
  const criticalFailure = 
    health.services.database.status === 'disconnected' ||
    !health.checks.mysqlServiceConfigured;

  if (criticalFailure) {
    health.status = 'unhealthy';
  }

  // Return with appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 207 : 503;

  return NextResponse.json(health, { status: statusCode });
}