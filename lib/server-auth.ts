// lib/server-auth.ts
// Server-side authentication helper using NextAuth

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
  employeeId?: string;
}

/**
 * Get authenticated user from Next.js API route using NextAuth
 *
 * IMPORTANT: Use this in API routes to get current user
 */
export async function getServerUser(request?: NextRequest): Promise<ServerUser | null> {
  try {
    // ✅ Use NextAuth getServerSession
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return null;
    }

    // Map NextAuth session to ServerUser
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      role: session.user.role || 'user',
      department: session.user.department,
      employeeId: session.user.employeeId
    } as ServerUser;

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