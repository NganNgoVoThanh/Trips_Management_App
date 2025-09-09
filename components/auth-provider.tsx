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
    
    const checkAuth = () => {
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
      const user = await authService.loginWithSSO(email)
      
      // Set cookie for middleware
      document.cookie = `session=${JSON.stringify(user)}; path=/; max-age=86400; SameSite=Lax`
      
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
    await authService.logout()
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.replace('/')
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