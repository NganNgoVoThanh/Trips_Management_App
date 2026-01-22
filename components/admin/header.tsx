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
import { Car, LogOut, Settings, User, BarChart3, Home, Shield, AlertTriangle, MapPin, Building2 } from "lucide-react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { data: session } = useSession()
  const user = session?.user
  const [locationName, setLocationName] = useState<string | null>(null)

  // Determine if user is Location Admin
  const isLocationAdmin = user?.adminType === 'location_admin' && user?.adminLocationId
  const isSuperAdmin = user?.adminType === 'super_admin'

  // Fetch location name for Location Admin
  useEffect(() => {
    if (isLocationAdmin && user?.adminLocationId) {
      fetch(`/api/locations?id=${user.adminLocationId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.location?.name) {
            setLocationName(data.location.name)
          }
        })
        .catch(() => setLocationName(user.adminLocationId || null))
    }
  }, [isLocationAdmin, user?.adminLocationId])

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
      // Only match exact dashboard path, NOT statistics sub-routes
      return pathname === '/admin/dashboard'
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
          {/* Admin Type Badge */}
          {isSuperAdmin ? (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border-red-200 text-red-700 font-medium">
              <Shield className="h-3.5 w-3.5" />
              Super Admin
            </Badge>
          ) : isLocationAdmin ? (
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border-blue-200 text-blue-700 font-medium">
                <Building2 className="h-3.5 w-3.5" />
                Location Admin
              </Badge>
              {locationName && (
                <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border-gray-200 text-gray-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationName}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border-gray-200 text-gray-700 font-medium">
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Avatar className="h-8 w-8">
                  {user?.image && (
                    <img
                      src={user.image}
                      alt={user?.name || 'Admin'}
                      className="h-full w-full object-cover rounded-full"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <AvatarFallback className="bg-red-600 text-white">
                    {getInitials(user?.name || 'Admin')}
                  </AvatarFallback>
                </Avatar>
                {/* Small admin indicator on avatar for mobile */}
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-600 border-2 border-background sm:hidden" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Administrator'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'Not logged in'}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {isSuperAdmin ? (
                    <Badge className="w-fit bg-red-100 text-red-700">Super Admin</Badge>
                  ) : isLocationAdmin ? (
                    <>
                      <Badge className="w-fit bg-blue-100 text-blue-700">Location Admin</Badge>
                      {locationName && (
                        <Badge variant="outline" className="w-fit text-xs">
                          <MapPin className="mr-1 h-3 w-3" />
                          {locationName}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge className="w-fit bg-gray-100 text-gray-700">Admin</Badge>
                  )}
                </div>
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