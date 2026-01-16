// app/api/auth/fabric-token/route.ts
// ✅ SECURITY FIX: Added authentication requirement for Fabric token endpoint

import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/server-auth';

// Force dynamic rendering (uses authentication)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Get Microsoft Fabric access token
 * ✅ REQUIRES AUTHENTICATION - only authenticated users can access
 * ✅ ADMIN ONLY - only admin users can access Fabric tokens
 */
export async function GET() {
  try {
    // ✅ SECURITY: Require authentication
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // ✅ SECURITY: Require admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get token from environment
    const token = process.env.FABRIC_ACCESS_TOKEN;

    if (!token) {
      console.error('❌ FABRIC_ACCESS_TOKEN not configured in environment variables');
      return NextResponse.json(
        { error: 'Fabric token not configured' },
        { status: 500 }
      );
    }

    // ✅ Log access for audit trail
    console.log(`✅ Fabric token accessed by admin: ${user.email}`);

    return NextResponse.json({
      token,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('❌ Error getting Fabric token:', error);
    return NextResponse.json(
      { error: 'Failed to get Fabric token' },
      { status: 500 }
    );
  }
}
