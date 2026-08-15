"use client";

/**
 * Header / Topbar aplikasi — CRM Graha Padma
 *
 * Berisi: search bar global (UI only), bell notifikasi, menu profil user.
 * Client Component karena menggunakan useState untuk dropdown.
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { UserRole } from "@/types";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/roles";

interface HeaderProps {
  userName: string;
  userEmail: string;
  role: UserRole;
}

export default function Header({ userName, userEmail, role }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-10">
      {/* Spacer untuk mobile menu button */}
      <div className="w-8 lg:hidden" aria-hidden="true" />

      {/* Search bar global */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Cari lead, unit, booking..."
            aria-label="Pencarian global"
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent focus:bg-white transition-colors"
            // Search fungsional akan diimplementasikan di fase berikutnya
            readOnly
          />
        </div>
      </div>

      {/* Spacer kanan */}
      <div className="flex-1" aria-hidden="true" />

      {/* Actions kanan */}
      <div className="flex items-center gap-2">
        {/* Bell notifikasi */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Notifikasi (belum ada notifikasi baru)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {/* Badge notifikasi — kosong dulu, akan diisi saat fitur notifikasi aktif */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" /> */}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" aria-hidden="true" />

        {/* Profil dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            {/* Avatar inisial */}
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-teal-700">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-900 leading-tight">{userName.split(" ")[0]}</p>
              <p className="text-xs text-gray-400 leading-tight">{ROLE_LABELS[role]}</p>
            </div>
            <svg
              className={`hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-100/50 py-1 z-50"
            >
              {/* Info user */}
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
                <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profil Saya
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-50 py-1">
                <button
                  role="menuitem"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
