"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Car, LogOut, Settings, User, BarChart3, Home } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { useEffect, useState } from "react"
import Image from "next/image"

export function AdminHeader() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const handleLogout = () => {
    authService.logout()
    toast({
      title: "Logged out successfully",
      description: "Redirecting to home page...",
    })
    setTimeout(() => router.push("/"), 1500)
  }

  const getInitials = (name: string) => {
    if (!name) return "A"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image
              src="/intersnack-logo.png"
              alt="Intersnack"
              width={100}
              height={50}
              className="object-contain"
            />
            <span className="font-bold text-red-600">ADMIN</span>
          </Link>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-red-600">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            
            <Link href="/management">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-red-600">
                <BarChart3 className="mr-2 h-4 w-4" />
                Management
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-red-600">
                <Car className="mr-2 h-4 w-4" />
                User View
              </Button>
            </Link>
          </nav>
        </div>
        
        {/* Admin Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-red-600 text-white">
                  {getInitials(user?.name || 'Admin')}
                </AvatarFallback>
              </Avatar>
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
            
            {/* Settings */}
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                System Settings
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
