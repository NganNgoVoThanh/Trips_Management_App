// app/api/auth/fabric-token/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production, implement proper OAuth flow with Azure AD
    // For now, return token from environment
    const token = process.env.FABRIC_ACCESS_TOKEN || '';
    
    if (!token) {
      return NextResponse.json(
        { error: 'Fabric token not configured' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      token,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get Fabric token' },
      { status: 500 }
    );
  }
}