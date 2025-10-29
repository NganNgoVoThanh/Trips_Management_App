// lib/auth-helpers.ts
import { NextRequest, NextResponse } from 'next/server';
import type { User } from './auth-service';

/**
 * Cookie configuration options for session management
 * These settings ensure cookies work on both HTTP and HTTPS
 */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Get cookie configuration based on request URL and environment
 *
 * Priority order:
 * 1. FORCE_SECURE_COOKIE env var (override everything)
 * 2. Auto-detect from request URL (https:// = secure)
 * 3. Default to false for flexibility
 *
 * Usage:
 * - Development (HTTP): secure=false automatically
 * - Production (HTTP): secure=false automatically
 * - Production (HTTPS): secure=true automatically
 * - Force secure on HTTP: Set FORCE_SECURE_COOKIE=false in .env
 * - Force secure on HTTPS: Set FORCE_SECURE_COOKIE=true in .env
 */
export function getCookieConfig(request: NextRequest, maxAge?: number): CookieOptions {
  // Check for explicit override from environment
  const forceSecure = process.env.FORCE_SECURE_COOKIE;

  // Get session max age from environment or use default (30 minutes)
  const sessionMaxAge = maxAge || parseInt(process.env.SESSION_MAX_AGE || '1800');

  let isSecure: boolean;

  if (forceSecure !== undefined) {
    // Environment override takes precedence
    isSecure = forceSecure === 'true';
  } else {
    // Auto-detect from request URL
    isSecure = request.url.startsWith('https://');
  }

  return {
    httpOnly: true,
    secure: isSecure, // Auto-detect or environment override
    sameSite: 'lax', // 'lax' works for HTTP, 'none' requires secure=true
    maxAge: sessionMaxAge, // Default: 30 minutes (1800 seconds)
    path: '/',
  };
}

/**
 * Set session cookie with proper configuration
 * Also sets session_timestamp cookie for tracking inactivity
 */
export function setSessionCookie(response: NextResponse, request: NextRequest, user: User) {
  const cookieConfig = getCookieConfig(request);

  // ✅ HttpOnly cookie for server-side validation (secure)
  response.cookies.set('session', JSON.stringify(user), cookieConfig);

  // ✅ Non-HttpOnly cookie for client-side reading (user info only, no sensitive data)
  response.cookies.set('user_info', JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId
  }), {
    ...cookieConfig,
    httpOnly: false // ✅ Allow JavaScript to read this cookie
  });

  // Set session timestamp cookie for inactivity tracking
  response.cookies.set('session_timestamp', Date.now().toString(), cookieConfig);
}

/**
 * Clear session cookie with proper configuration
 * Also clears session_timestamp and user_info cookies
 */
export function clearSessionCookie(response: NextResponse, request: NextRequest) {
  const isSecure = request.url.startsWith('https://');

  // Clear all session-related cookies
  const cookiesToClear = ['session', 'session_timestamp', 'user_info'];

  cookiesToClear.forEach(cookieName => {
    // Method 1: Set with maxAge = 0
    response.cookies.set(cookieName, '', {
      httpOnly: cookieName !== 'user_info', // user_info is not httpOnly
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    // Method 2: Explicitly delete
    response.cookies.delete(cookieName);
  });
}

/**
 * Extract user information from request headers (set by middleware)
 * This allows API routes to access authenticated user data
 */
export function getUserFromRequest(request: NextRequest): User | null {
  try {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role') as 'admin' | 'user';
    
    // If no user headers, try to get from cookie as fallback
    if (!userId || !userEmail || !userRole) {
      const sessionCookie = request.cookies.get('session');
      
      if (sessionCookie) {
        try {
          const userData = JSON.parse(sessionCookie.value);
          return userData as User;
        } catch (error) {
          console.error('Failed to parse session cookie:', error);
          return null;
        }
      }
      
      return null;
    }
    
    // Extract name from email
    const name = userEmail.split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    
    // Construct user object from headers
    const user: User = {
      id: userId,
      email: userEmail,
      name: name,
      role: userRole,
      employeeId: userId.replace('user-', 'EMP').toUpperCase().substring(0, 12),
      createdAt: new Date().toISOString()
    };
    
    return user;
  } catch (error) {
    console.error('Error extracting user from request:', error);
    return null;
  }
}

/**
 * Verify user is authenticated
 * Throws error if not authenticated
 */
export function requireAuth(request: NextRequest): User {
  const user = getUserFromRequest(request);
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}

/**
 * Verify user has admin role
 * Throws error if not admin
 */
export function requireAdmin(request: NextRequest): User {
  const user = requireAuth(request);
  
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return user;
}