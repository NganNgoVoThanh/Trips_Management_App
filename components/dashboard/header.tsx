// components/dashboard/header.tsx
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
import { Car, Calendar, LogOut, User, BarChart3, Home } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
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

      // ✅ Use NextAuth signOut
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
          <Link href={user?.role === 'admin' ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
            <Image
              src="/intersnack-logo.png"
              alt="Intersnack"
              width={100}
              height={50}
              className="object-contain"
            />
            {user?.role === 'admin' && (
              <span className="font-bold text-red-600">ADMIN</span>
            )}
          </Link>
          
          {/* Navigation Links - User View Only */}
          <nav className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "transition-all cursor-pointer",
                isActive('/dashboard')
                  ? "bg-red-50 text-red-600 font-medium border-b-2 border-red-600 rounded-b-none hover:bg-red-100"
                  : "text-gray-700 hover:text-red-600 hover:bg-gray-50"
              )}
            >
              <Link href="/dashboard">
                <Calendar className="mr-2 h-4 w-4" />
                My Trips
              </Link>
            </Button>
          </nav>
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                {user?.image && (
                  <img
                    src={user.image}
                    alt={user.name || 'User'}
                    className="h-full w-full object-cover rounded-full"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <AvatarFallback className={user?.role === 'admin' ? "bg-red-600 text-white" : "bg-red-100 text-red-600"}>
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
                {user?.role === 'admin' && (
                  <Badge className="mt-1 w-fit bg-red-100 text-red-700">Administrator</Badge>
                )}
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