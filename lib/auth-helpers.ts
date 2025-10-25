// lib/auth-helpers.ts
import { NextRequest } from 'next/server';
import type { User } from './auth-service';

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