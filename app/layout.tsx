// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trips Management System | Intersnack",
  description: "Business trip management and optimization system for Intersnack Vietnam",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh antialiased overflow-x-hidden">
        <div className="relative min-h-dvh">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-white" />
            <div className="absolute inset-0 [background-image:radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.10),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(225,29,72,0.08),transparent_30%),radial-gradient(circle_at_120%_80%,rgba(244,63,94,0.08),transparent_35%)]" />
            <div className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.7)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute -top-24 -left-24 h-72 w-72 blur-3xl rounded-full bg-[#C00000]/20" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 blur-3xl rounded-full bg-[#C00000]/50" />
          </div>

          {children}
        </div>
      </body>
    </html>
  );
}
