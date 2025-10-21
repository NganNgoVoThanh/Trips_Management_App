"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/auth-service'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isChecking = useRef(false)

  useEffect(() => {
    // Prevent multiple simultaneous checks
    if (isChecking.current) return
    
    const checkAuth = async () => {
      isChecking.current = true
      
      try {
        const user = authService.getCurrentUser()
        
        // If on protected route without auth
        if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
          router.push('/')
          return
        }
        
        // If admin route without admin role
        if (pathname.startsWith('/admin') && user?.role !== 'admin') {
          router.push('/dashboard')
          return
        }
      } finally {
        isChecking.current = false
      }
    }
    
    checkAuth()
  }, [pathname, router])

  return <>{children}</>
}

// Hook to use auth in components
export function useAuth() {
  const router = useRouter()
  
  const login = async (email: string) => {
    try {
      // Call API login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const user = await response.json();
      
      // ✅ Update local auth service
      await authService.loginWithSSO(email);
      
      // Use replace instead of push to prevent back button issues
      if (user.role === 'admin') {
        router.replace('/admin/dashboard')
      } else {
        router.replace('/dashboard')
      }
      
      return user
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }
  
  const logout = async () => {
    try {
      // ✅ Call API logout endpoint FIRST
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // ✅ Then clear local session
      await authService.logout();
      
      // ✅ Force clear all possible storage
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      // ✅ Hard redirect to clear any cached state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/';
    }
  }
  
  const user = authService.getCurrentUser()
  
  return {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  }
}