// lib/server-auth.ts
// Server-side authentication helper
// Extracts user info from request headers (set by middleware)

import { NextRequest } from 'next/server';
import { headers, cookies } from 'next/headers';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
  employeeId?: string;
}

/**
 * Get authenticated user from Next.js API route request
 * This reads from headers injected by middleware
 * 
 * IMPORTANT: Use this in API routes, not getUserFromRequest
 */
export async function getServerUser(request?: NextRequest): Promise<ServerUser | null> {
  try {
    // Method 1: From request headers (if request object provided)
    if (request) {
      const userId = request.headers.get('x-user-id');
      const userEmail = request.headers.get('x-user-email');
      const userRole = request.headers.get('x-user-role');
      
      if (userId && userEmail && userRole) {
        // Get full user data from session cookie
        const session = request.cookies.get('session');
        if (session?.value) {
          try {
            const userData = JSON.parse(session.value);
            return userData as ServerUser;
          } catch (e) {
            console.error('Failed to parse session:', e);
          }
        }
        
        // Fallback: construct user from headers
        return {
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0],
          role: userRole as 'admin' | 'user'
        };
      }
    }
    
    // Method 2: From headers() in Route Handlers (Next.js 13+)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userEmail = headersList.get('x-user-email');
    const userRole = headersList.get('x-user-role');
    
    if (userId && userEmail && userRole) {
      // Get full user data from cookies
      const cookieStore = await cookies();
      const session = cookieStore.get('session');
      
      if (session?.value) {
        try {
          const userData = JSON.parse(session.value);
          return userData as ServerUser;
        } catch (e) {
          console.error('Failed to parse session:', e);
        }
      }
      
      // Fallback: construct user from headers
      return {
        id: userId,
        email: userEmail,
        name: userEmail.split('@')[0],
        role: userRole as 'admin' | 'user'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (for API routes)
 * Throws error if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<ServerUser> {
  const user = await getServerUser(request);
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}

/**
 * Check if user is admin (for admin API routes)
 * Throws error if not authenticated or not admin
 */
export async function requireAdmin(request?: NextRequest): Promise<ServerUser> {
  const user = await requireAuth(request);
  
  if (user.role !== 'admin') {
    throw new Error('Unauthorized - Admin access required');
  }
  
  return user;
}

// Note: getUserFromRequest is NOT exported - use getServerUser instead