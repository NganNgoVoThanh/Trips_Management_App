"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { config } from "@/lib/config"
import Image from "next/image"

export function LoginButton({ 
  size = "default", 
  className = "" 
}: { 
  size?: "default" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate email domain
      if (!email.endsWith(config.companyDomain)) {
        toast({
          title: "Invalid Email",
          description: `Please use your company email (${config.companyDomain})`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Authenticate with SSO
      const user = await authService.loginWithSSO(email)
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.name}!`,
      })

      // Redirect based on role
      if (user.role === 'admin') {
        setTimeout(() => router.push("/admin/dashboard"), 1500)
      } else {
        setTimeout(() => router.push("/dashboard"), 1500)
      }

      setOpen(false)
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size={size} 
          className={className || (size === "lg" ? "px-8" : "")}
        >
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <DialogTitle>Sign in with SSO</DialogTitle>
            <Image 
              src="/intersnack-logo.png" 
              alt="Intersnack" 
              width={80} 
              height={40}
              className="object-contain"
            />
          </div>
          <DialogDescription>
            Use your Intersnack company email to sign in to the Trips Management System.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Company Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.name@intersnack.com.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Must use @intersnack.com.vn email address
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Continue with SSO'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}