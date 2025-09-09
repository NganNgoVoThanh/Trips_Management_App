import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validate email domain
    if (!email.endsWith(config.companyDomain)) {
      return NextResponse.json(
        { error: `Please use your company email (${config.companyDomain})` },
        { status: 400 }
      );
    }
    
    // In production, integrate with actual SSO provider
    // For now, simulate authentication
    const user = await authService.loginWithSSO(email, password);
    
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
