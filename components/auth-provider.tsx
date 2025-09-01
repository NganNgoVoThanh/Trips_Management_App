"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/auth-service'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
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
      document.cookie = `session=${JSON.stringify(user)}; path=/; max-age=86400`
      
      // Navigate based on role
      if (user.role === 'admin') {
        await router.push('/admin/dashboard')
      } else {
        await router.push('/dashboard')
      }
      
      // Force a hard navigation if soft navigation fails
      setTimeout(() => {
        const currentPath = window.location.pathname
        if (currentPath === '/') {
          window.location.href = user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
        }
      }, 100)
      
      return user
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }
  
  const logout = async () => {
    await authService.logout()
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/')
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