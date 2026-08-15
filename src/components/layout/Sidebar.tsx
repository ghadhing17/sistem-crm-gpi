"use client";

/**
 * Sidebar navigasi utama — CRM Graha Padma
 *
 * Menu ditampilkan/disembunyikan berdasarkan role user (PRD Bab 3.1).
 * Responsive: collapse ke icon-only di mobile, full di desktop.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Definisi menu item
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Role yang boleh melihat menu ini. Kosong = semua role. */
  allowedRoles?: UserRole[];
  /** Sub-menu (level 2) */
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    label: "Leads",
    href: "/leads",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    // Management hanya bisa lihat, tidak perlu input — tapi tetap bisa akses daftar
    children: [
      { label: "Daftar Lead", href: "/leads" },
      { label: "Pipeline / Kanban", href: "/leads/pipeline" },
    ],
  },
  {
    label: "Unit & Inventory",
    href: "/units",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    label: "Laporan",
    href: "/reports/sales",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    children: [
      { label: "Laporan Sales", href: "/reports/sales" },
      { label: "Laporan Inventory", href: "/reports/inventory" },
      { label: "Dashboard Eksekutif", href: "/reports/executive" },
    ],
  },
  {
    label: "Pengaturan",
    href: "/settings/master-data",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    allowedRoles: ["ADMIN_BACK_OFFICE", "SALES_MANAGER", "SUPER_ADMIN"],
    children: [
      { label: "Master Data", href: "/settings/master-data" },
      { label: "Manajemen User", href: "/settings/users" },
      { label: "Template", href: "/settings/templates" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

interface SidebarProps {
  role: UserRole;
  userName: string;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["/leads", "/reports/sales", "/settings/master-data"]);

  // Filter menu berdasarkan role
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );

  function toggleExpand(href: string) {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function isParentActive(item: NavItem) {
    if (item.children) {
      return item.children.some((c) => pathname.startsWith(c.href));
    }
    return isActive(item.href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#009182] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Graha Padma</p>
            <p className="text-xs text-gray-400 truncate">CRM Internal</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Navigasi utama">
        {visibleItems.map((item) => {
          const active = isParentActive(item);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus.includes(item.href);

          return (
            <div key={item.href}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                    active
                      ? "bg-teal-50 text-[#009182] font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${collapsed ? "justify-center" : "justify-between"}`}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg
                      className={`flex-shrink-0 w-4 h-4 ${active ? "text-[#009182]" : "text-gray-400 group-hover:text-gray-600"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <svg
                      className={`flex-shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                    active
                      ? "bg-teal-50 text-[#009182] font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <svg
                    className={`flex-shrink-0 w-4 h-4 ${active ? "text-[#009182]" : "text-gray-400 group-hover:text-gray-600"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )}

              {/* Sub-menu */}
              {hasChildren && isExpanded && !collapsed && (
                <div className="mt-0.5 ml-7 space-y-0.5">
                  {item.children!.map((child) => {
                    // Sembunyikan "Dashboard Eksekutif" untuk Sales Executive
                    if (child.href === "/reports/executive" && role === "SALES_EXECUTIVE") return null;
                    // Sembunyikan "Manajemen User" untuk non Super Admin
                    if (child.href === "/settings/users" && role !== "SUPER_ADMIN") return null;

                    const childActive = pathname === child.href || (child.href !== "/leads" && pathname.startsWith(child.href));
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          childActive
                            ? "text-[#009182] font-medium bg-teal-50"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${childActive ? "bg-[#009182]" : "bg-gray-300"}`} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info + collapse button */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-teal-700">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{role.replace(/_/g, " ")}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Ciutkan</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-30 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Buka navigasi"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (drawer) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
