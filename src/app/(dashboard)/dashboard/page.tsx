/**
 * Halaman Dashboard — CRM Graha Padma
 *
 * Dashboard kosong yang menampilkan info role dan link navigasi.
 * Konten penuh akan diisi di fase berikutnya per modul (PRD 5.1-5.9).
 *
 * Server Component — baca session di server untuk performa optimal.
 */

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { canViewExecutiveDashboard } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import SignOutButton from "@/components/auth/SignOutButton";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const namaRole = ROLE_LABELS[role];
  const bisaLihatEksekutif = canViewExecutiveDashboard({ id: session.user.id, role });

  // Menu navigasi utama yang tersedia per role
  const navItems = [
    {
      label: "Leads",
      href: "/leads",
      desc: "Daftar & pipeline prospek customer",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      show: true,
    },
    {
      label: "Units & Inventory",
      href: "/units",
      desc: "Peta blok dan ketersediaan unit",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      show: true,
    },
    {
      label: "Bookings",
      href: "/bookings",
      desc: "Transaksi, approval, dan checklist",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      show: true,
    },
    {
      label: "Laporan",
      href: bisaLihatEksekutif ? "/reports/executive" : "/reports/sales",
      desc: bisaLihatEksekutif
        ? "Dashboard eksekutif & analitik bisnis"
        : "Laporan performa sales saya",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      show: true,
    },
    {
      label: "Pengaturan",
      href: "/settings/master-data",
      desc: "Master data, user, dan konfigurasi sistem",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      show: role === "ADMIN_BACK_OFFICE" || role === "SALES_MANAGER" || role === "SUPER_ADMIN",
    },
  ].filter((item) => item.show);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Selamat datang, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Anda login sebagai{" "}
            <span className="font-medium text-[#009182]">{namaRole}</span>
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Info banner untuk akun yang perlu ganti password */}
      {session.user.mustChangePassword && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            <strong>Perhatian:</strong> Silakan ganti password Anda. Fitur ini
            akan tersedia di pengaturan akun.
          </span>
        </div>
      )}

      {/* Grid navigasi modul */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-[#009182] hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 group-hover:bg-[#009182] flex items-center justify-center transition-colors">
                <svg
                  className="w-5 h-5 text-[#009182] group-hover:text-white transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={item.icon}
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#009182] transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Info status sistem */}
      <div className="mt-8 px-4 py-3 rounded-lg bg-white border border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        Sistem aktif &mdash; Database terhubung
        <span className="ml-auto">v1.0.0</span>
      </div>
    </div>
  );
}
