/**
 * Layout utama aplikasi — CRM Graha Padma
 * Berisi Sidebar + Header yang dipakai semua halaman dalam grup (dashboard).
 * Server Component — baca session di server, pass ke Client Components.
 */

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const userName = session.user.name ?? "Pengguna";
  const userEmail = session.user.email ?? "";

  return (
    <div className="flex h-screen bg-[#F4F7F8] overflow-hidden">
      {/* Sidebar — sticky di kiri, bisa collapse */}
      <Sidebar role={role} userName={userName} />

      {/* Konten utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — sticky di atas */}
        <Header userName={userName} userEmail={userEmail} role={role} />

        {/* Area konten halaman */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
