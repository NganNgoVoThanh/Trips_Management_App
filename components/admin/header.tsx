// components/admin/header.tsx
"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Car, LogOut, Settings, User, BarChart3, Home, Shield, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { data: session } = useSession()
  const user = session?.user

  const handleLogout = async () => {
    try {
      toast({
        title: "Signing out...",
        description: "Please wait",
      })

      // Use NextAuth signOut
      await signOut({
        callbackUrl: '/',
        redirect: true
      })
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
    if (!name) return "A"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Check if route is active
  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname?.startsWith('/admin/statistics')
    }
    return pathname === path || pathname?.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3">
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
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/admin/dashboard')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/admin/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/management')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/management">
                <BarChart3 className="mr-2 h-4 w-4" />
                Management
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/admin/vehicles')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/admin/vehicles">
                <Car className="mr-2 h-4 w-4" />
                Providers
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/admin/manual-override')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/admin/manual-override">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Override
              </Link>
            </Button>

            {user?.adminType === 'super_admin' && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "transition-all cursor-pointer",
                  isActive('/admin/manage-admins')
                    ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                    : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
                )}
              >
                <Link href="/admin/manage-admins">
                  <Shield className="mr-2 h-4 w-4" />
                  Manage Admins
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/dashboard') && !pathname?.startsWith('/admin')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                User View
              </Link>
            </Button>
          </nav>
        </div>
        
        {/* Admin Menu */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border-red-200 text-red-700 font-medium">
            <Shield className="h-3.5 w-3.5" />
            Admin
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-red-600 text-white">
                    {getInitials(user?.name || 'Admin')}
                  </AvatarFallback>
                </Avatar>
                {/* Small admin indicator on avatar for mobile */}
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-600 border-2 border-background sm:hidden" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Administrator'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'admin@intersnack.com.vn'}
                </p>
                <Badge className="mt-1 w-fit bg-red-100 text-red-700">Administrator</Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Profile Link */}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            
            {/* Management Dashboard */}
            <DropdownMenuItem asChild>
              <Link href="/management" className="cursor-pointer">
                <BarChart3 className="mr-2 h-4 w-4" />
                Management Dashboard
              </Link>
            </DropdownMenuItem>        
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  )
}