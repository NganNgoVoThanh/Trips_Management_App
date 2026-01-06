// app/api/manager/confirm/route.ts
// API endpoint for manager email confirmation

import { NextRequest, NextResponse } from 'next/server';
import { processManagerConfirmation } from '@/lib/manager-verification-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const action = searchParams.get('action') as 'confirm' | 'reject';

    if (!token || !action) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
  <title>Invalid Request</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
    .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">⚠️</div>
    <h1>Invalid Request</h1>
    <p>The confirmation link is invalid or incomplete.</p>
  </div>
</body>
</html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Process confirmation
    const result = await processManagerConfirmation(token, action);

    if (!result.success) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
  <title>Confirmation Failed</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
    .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">❌</div>
    <h1>Confirmation Failed</h1>
    <p>${result.message}</p>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      If you believe this is an error, please contact your HR department.
    </p>
  </div>
</body>
</html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Success
    if (action === 'confirm') {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
  <title>Manager Confirmed</title>
  <meta http-equiv="refresh" content="3;url=${result.redirect || '/'}">
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #4CAF50, #81C784); margin: 0; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); text-align: center; max-width: 500px; }
    .success { color: #4CAF50; font-size: 64px; margin-bottom: 20px; }
    h1 { color: #333; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .redirect-notice { background: #e8f5e9; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 14px; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h1>Manager Confirmed Successfully!</h1>
    <p>${result.message}</p>
    <p>The employee has been notified and can now submit business trip requests.</p>
    <div class="redirect-notice">
      Redirecting you in 3 seconds...
    </div>
  </div>
</body>
</html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    } else {
      // Rejection
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
<head>
  <title>Manager Relationship Rejected</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
    .icon { color: #757575; font-size: 64px; margin-bottom: 20px; }
    h1 { color: #333; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">ℹ️</div>
    <h1>Relationship Rejected</h1>
    <p>You have declined to be this employee's reporting manager.</p>
    <p>The employee has been notified and will need to select a different manager.</p>
  </div>
</body>
</html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }
  } catch (error: any) {
    console.error('❌ Error processing manager confirmation:', error);
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <title>Error</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; margin: 0; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
    .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">❌</div>
    <h1>An Error Occurred</h1>
    <p>We encountered an error processing your request. Please try again later or contact IT support.</p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">${error.message}</p>
  </div>
</body>
</html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
        }
      );
  }
}
