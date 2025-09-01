// app/page.tsx
"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { LoginButton } from "@/components/login-button";
import Image from "next/image";

export default function Page() {
  return (
    <div className="relative min-h-dvh flex flex-col">
      {/* MAIN */}
      <section className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-16 lg:py-4">
          <div className="grid items-center gap-12 xl:gap-20 lg:grid-cols-[1.1fr_0.9fr]">
            {/* LEFT */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col"
            >
              {/* ✅ Logo: ưu tiên dùng file SVG/PNG nền trong suốt */}
              <div className="mb-15 flex items-center gap-1">
                <Image
                  src="/intersnack-logo.png"  // <--- nếu có SVG nền trong suốt, dùng cái này
                  alt="Intersnack"
                  width={200}
                  height={90}
                  className="object-contain mix-blend-multiply opacity-95"
                  priority
                />
                {/* Nếu bạn chỉ có PNG nền trắng, dùng ảnh dưới và bật mix-blend: 
                <Image
                  src="/intersnack-logo.png"
                  alt="Intersnack"
                  width={150}
                  height={72}
                  className="object-contain mix-blend-multiply opacity-95" // tạm xử lý nền trắng
                  priority
                /> 
                */}
              </div>

              <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-[#dc2626] sm:text-5xl">
                Trips Management <span className="text-gray-900">System</span>
              </h1>

              <p className="mb-10 max-w-2xl text-base leading-relaxed text-gray-700 sm:text-lg">
                Smart trip management system that reduces transportation costs by{" "}
                <span className="font-semibold text-[#dc2626]">
                  intelligently combining similar trips
                </span>{" "}
                between Intersnack facilities.
              </p>

              <div className="flex justify-start">
                <LoginButton
                  size="lg"
                  className="h-11 rounded-xl px-8 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold"
                />
              </div>
            </motion.div>

            {/* RIGHT – Features ở hero (giữ nguyên nếu bạn muốn) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col space-y-7"
            >
              {[
                { n: 1, title: "Register Your Trip", desc: "Submit your business trip details including departure and return schedules." },
                { n: 2, title: "AI Optimization",    desc: "Our system automatically identifies opportunities to combine trips for cost savings." },
                { n: 3, title: "Save Costs",         desc: "Reduce transportation expenses by up to 40% through intelligent trip combining." },
              ].map((f) => (
                <div key={f.n} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-white font-bold">
                    {f.n}
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ✅ NEW: Key Features section (thêm trên Our Locations để lấp khoảng trống) */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-20"
          >
            <h2 className="mb-8 text-center text-2xl font-bold text-[#dc2626] sm:text-3xl">
              Key Features
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Role-based Access", desc: "Auto-redirect to User/Admin dashboards after sign-in, based on your role." },
                { title: "Approval Workflow", desc: "Streamlined submission and approval process with clear status tracking." },
                { title: "Cost Insights",     desc: "Analytics to highlight savings from combined trips and route optimization." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border p-5 bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                  <h3 className="mb-1 text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Our Locations */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-20"
          >
            <h2 className="mb-8 text-center text-2xl font-bold text-[#dc2626] sm:text-3xl">
              Our Locations
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "HCM Office", addr: "76 Le Lai Street, Ben Thanh Ward, District 1, HCMC" },
                { name: "Phan Thiet Factory", addr: "Phan Thiet Industrial Zone Phase 1, Binh Thuan Province" },
                { name: "Long An Factory", addr: "Loi Binh Nhon Industrial Cluster, Tan An City, Long An Province" },
                { name: "Tay Ninh Factory", addr: "Kinh Te Hamlet, Binh Minh Commune, Tay Ninh City" },
              ].map((loc) => (
                <div
                  key={loc.name}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-[#dc2626]" fill="currentColor">
                      <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                    </svg>
                    <div>
                      <h3 className="mb-1 text-sm font-semibold">{loc.name}</h3>
                      <p className="text-xs text-gray-500">{loc.addr}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-gray-50 py-5">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2 text-center md:flex-row">
            <p className="text-sm text-gray-600">© Intersnack Cashew Vietnam. All rights reserved.</p>
            <span className="hidden text-gray-400 md:inline">•</span>
            <p className="text-sm text-gray-500">Support: rd@intersnack.com.sg</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
