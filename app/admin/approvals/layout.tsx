// app/admin/approvals/layout.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider>{children}</SessionProvider>
}
