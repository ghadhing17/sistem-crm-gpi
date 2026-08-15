/**
 * Halaman Unauthorized — 403
 * Ditampilkan saat user login tapi mencoba akses route yang tidak sesuai role-nya.
 */
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { ROLE_DEFAULT_REDIRECT } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export const metadata = {
  title: "Akses Ditolak",
};

export default async function UnauthorizedPage() {
  const session = await auth();
  const defaultHref = session
    ? (ROLE_DEFAULT_REDIRECT[session.user.role as UserRole] ?? "/dashboard")
    : "/login";

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {/* Ikon kunci */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Akses Ditolak
        </h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi
          administrator jika Anda membutuhkan akses.
        </p>

        <Link
          href={defaultHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#009182] text-white text-sm font-medium hover:bg-[#007a6e] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Kembali ke halaman saya
        </Link>
      </div>
    </div>
  );
}
