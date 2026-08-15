"use client";

/**
 * NotifikasiBell — bell icon dengan badge unread count + dropdown list
 * PRD 5.9 & Bab 7 poin 9: bell icon, badge, dropdown terkelompok per hari
 *
 * Poll unread count setiap 30 detik.
 * Load daftar notifikasi saat dropdown dibuka.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface Notifikasi {
  id: string;
  jenis: string;
  pesan: string;
  isRead: boolean;
  linkRef: string | null;
  refId: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Konfigurasi ikon & warna per jenis notifikasi
// ---------------------------------------------------------------------------

const JENIS_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  LEAD_DIASSIGN: {
    bg: "bg-teal-100",
    color: "text-teal-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  REMINDER_FOLLOWUP: {
    bg: "bg-amber-100",
    color: "text-amber-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  LEAD_BARU_MASUK: {
    bg: "bg-blue-100",
    color: "text-blue-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  BOOKING_MENUNGGU_APPROVAL: {
    bg: "bg-orange-100",
    color: "text-orange-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  BOOKING_DISETUJUI: {
    bg: "bg-green-100",
    color: "text-green-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  BOOKING_DITOLAK: {
    bg: "bg-red-100",
    color: "text-red-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const DEFAULT_META = {
  bg: "bg-gray-100",
  color: "text-gray-500",
  icon: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Helper: label grup tanggal
// ---------------------------------------------------------------------------

function labelGrupTanggal(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date))     return "Hari Ini";
  if (isYesterday(date)) return "Kemarin";
  return format(date, "d MMMM yyyy", { locale: localeId });
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

interface NotifikasiBellProps {
  /** Polling interval dalam milidetik, default 30000 (30 detik) */
  pollInterval?: number;
}

export default function NotifikasiBell({ pollInterval = 30000 }: NotifikasiBellProps) {
  const [open, setOpen]             = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs]         = useState<Notifikasi[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Poll unread count
  // -------------------------------------------------------------------------
  const fetchCount = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications/count");
      const json = await res.json();
      if (res.ok) setUnreadCount(json.data.count ?? 0);
    } catch {
      // Fail silently — jangan crash karena polling notifikasi
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCount, pollInterval]);

  // -------------------------------------------------------------------------
  // Load notifikasi saat dropdown dibuka
  // -------------------------------------------------------------------------
  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    setLoadingNotifs(true);
    try {
      const res  = await fetch("/api/notifications?limit=30");
      const json = await res.json();
      if (res.ok) setNotifs(json.data.notifications ?? []);
    } finally {
      setLoadingNotifs(false);
    }
  }

  // -------------------------------------------------------------------------
  // Mark all as read
  // -------------------------------------------------------------------------
  async function handleMarkAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnreadCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  // -------------------------------------------------------------------------
  // Mark satu notifikasi sebagai dibaca saat diklik
  // -------------------------------------------------------------------------
  async function handleNotifClick(notif: Notifikasi) {
    if (!notif.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      });
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  }

  // -------------------------------------------------------------------------
  // Tutup saat klik di luar
  // -------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------------------------------------------------------------
  // Kelompokkan notifikasi per hari
  // -------------------------------------------------------------------------
  const grouped: { label: string; items: Notifikasi[] }[] = [];
  for (const notif of notifs) {
    const label = labelGrupTanggal(notif.createdAt);
    const existing = grouped.find((g) => g.label === label);
    if (existing) {
      existing.items.push(notif);
    } else {
      grouped.push({ label, items: [notif] });
    }
  }

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
          open
            ? "bg-gray-100 text-gray-700"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
        aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {/* Badge count */}
        {badgeCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5 leading-none"
            aria-hidden="true"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="region"
          aria-label="Daftar notifikasi"
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 z-50 overflow-hidden"
        >
          {/* Header dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#009182] hover:text-[#007a6e] font-medium transition-colors"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Isi */}
          <div className="max-h-[380px] overflow-y-auto">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-4 h-4 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Tidak ada notifikasi</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  {/* Label grup tanggal */}
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0">
                    {group.label}
                  </p>

                  {group.items.map((notif) => {
                    const meta = JENIS_META[notif.jenis] ?? DEFAULT_META;
                    const content = (
                      <div
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          notif.isRead ? "hover:bg-gray-50" : "bg-teal-50/40 hover:bg-teal-50/70"
                        }`}
                        onClick={() => handleNotifClick(notif)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNotifClick(notif); }}
                        aria-label={notif.pesan}
                      >
                        {/* Ikon jenis */}
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center mt-0.5`}>
                          {meta.icon}
                        </div>

                        {/* Konten */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                            {notif.pesan}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDistanceToNow(new Date(notif.createdAt), {
                              addSuffix: true,
                              locale: localeId,
                            })}
                          </p>
                        </div>

                        {/* Dot unread */}
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#009182] flex-shrink-0 mt-1.5" aria-hidden="true" />
                        )}
                      </div>
                    );

                    return notif.linkRef ? (
                      <Link key={notif.id} href={notif.linkRef} className="block cursor-pointer">
                        {content}
                      </Link>
                    ) : (
                      <div key={notif.id} className="cursor-pointer">
                        {content}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">
                Menampilkan {notifs.length} notifikasi terbaru
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
