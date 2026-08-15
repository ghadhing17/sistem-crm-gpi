"use client";

/**
 * Halaman Dashboard — CRM Graha Padma
 * PRD 5.8: konten berbeda per role
 * - Sales Executive: stats per status + daftar perlu follow-up
 * - Sales Manager / Super Admin: funnel tim + unassigned leads + workload
 * - Admin BO / Management: navigasi modul utama
 */

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import DashboardSalesExec from "@/components/dashboard/DashboardSalesExec";
import DashboardSalesManager from "@/components/dashboard/DashboardSalesManager";
import Link from "next/link";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Skeleton loading
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-2.5">
          {[1,2,3,4].map((i) => <div key={i} className="h-6 bg-gray-100 rounded-full" />)}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Admin BO / Management — navigasi modul
// ---------------------------------------------------------------------------

const NAV_ITEMS_ABO = [
  { label: "Daftar Booking",    href: "/bookings",          desc: "Kelola transaksi dan approval",         icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Unit & Inventory",  href: "/units",             desc: "Peta blok dan master data unit",        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { label: "Semua Lead",        href: "/leads",             desc: "Daftar seluruh lead dan pipeline",      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { label: "Laporan Operasional", href: "/reports/sales",  desc: "Laporan performa dan inventori",        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Pengaturan",        href: "/settings/master-data", desc: "Master data dan konfigurasi sistem",icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const NAV_ITEMS_MANAGEMENT = [
  { label: "Dashboard Eksekutif", href: "/reports/executive", desc: "Ringkasan performa bisnis keseluruhan", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Laporan Sales",       href: "/reports/sales",     desc: "Funnel, konversi, dan performa sales",  icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Laporan Inventory",   href: "/reports/inventory", desc: "Okupansi cluster dan ketersediaan unit", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Semua Lead",          href: "/leads",             desc: "Daftar lead seluruh tim (read-only)",   icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
];

function DashboardNavGrid({ items, title, subtitle }: {
  items: typeof NAV_ITEMS_ABO;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-[#009182] hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 group-hover:bg-[#009182] flex items-center justify-center transition-colors">
                <svg
                  className="w-5 h-5 text-[#009182] group-hover:text-white transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#009182] transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama — Client Component karena pakai useSession
// ---------------------------------------------------------------------------

function DashboardContent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <DashboardSkeleton />;
  if (!session) return null;

  const role     = session.user.role as UserRole;
  const userName = session.user.name ?? "Pengguna";

  switch (role) {
    case "SALES_EXECUTIVE":
      return <DashboardSalesExec userName={userName} />;

    case "SALES_MANAGER":
    case "SUPER_ADMIN":
      return <DashboardSalesManager userName={userName} />;

    case "ADMIN_BACK_OFFICE":
      return (
        <DashboardNavGrid
          items={NAV_ITEMS_ABO}
          title={`Selamat datang, ${userName.split(" ")[0]}`}
          subtitle="Admin / Back Office — kelola unit, booking, dan dokumen"
        />
      );

    case "MANAGEMENT":
      return (
        <DashboardNavGrid
          items={NAV_ITEMS_MANAGEMENT}
          title={`Selamat datang, ${userName.split(" ")[0]}`}
          subtitle="Management — akses laporan dan data bisnis keseluruhan"
        />
      );

    default:
      return (
        <DashboardNavGrid
          items={NAV_ITEMS_ABO}
          title={`Selamat datang, ${userName.split(" ")[0]}`}
          subtitle="CRM Graha Padma"
        />
      );
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
