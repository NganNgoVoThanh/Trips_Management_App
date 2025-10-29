// components/dashboard/header.tsx
"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Car, Calendar, LogOut, User, BarChart3 } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      toast({
        title: "Logged out successfully",
        description: "Redirecting to home page...",
      })
      // Use hard reload to ensure cookies are fully cleared
      setTimeout(() => {
        window.location.href = "/"
      }, 500)
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Check if route is active
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/intersnack-logo.png"
              alt="Intersnack"
              width={100}
              height={50}
              className="object-contain"
            />
          </Link>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "transition-all",
                  isActive('/dashboard') && !pathname?.startsWith('/management')
                    ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                    : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Trips
              </Button>
            </Link>
            
            {/* Management link - only for admin */}
            {user?.role === 'admin' && (
              <Link href="/management">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "transition-all",
                    isActive('/management')
                      ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                      : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
                  )}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Management
                </Button>
              </Link>
            )}
          </nav>
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-100 text-red-600">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'user@intersnack.com.vn'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Profile Link */}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            
            {/* Management Link in Dropdown for Admin */}
            {user?.role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link href="/management" className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Management Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}