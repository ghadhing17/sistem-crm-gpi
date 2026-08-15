"use client";

/**
 * Halaman /bookings — Daftar Booking
 * PRD 5.5: daftar semua booking dengan filter status
 * - Sales Executive: hanya booking miliknya
 * - Manager, Admin BO: semua booking
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { UserRole } from "@/types";

interface BookingItem {
  id: string; status: string; skemaPembayaran: string;
  hargaNormal: string; hargaDeal: string; diskonPersen: number;
  bookingFee: string | null; createdAt: string;
  lead: { id: string; nama: string; noHp: string } | null;
  unit: { id: string; blok: string; noKavling: string; tipe: string; cluster: { namaCluster: string } } | null;
  sales: { id: string; nama: string } | null;
  approver: { id: string; nama: string } | null;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: "Draft",               color: "bg-gray-100 text-gray-600" },
  MENUNGGU_APPROVAL:   { label: "Menunggu Approval",   color: "bg-amber-100 text-amber-700" },
  DISETUJUI:           { label: "Disetujui",           color: "bg-green-100 text-green-700" },
  DITOLAK:             { label: "Ditolak",             color: "bg-red-100 text-red-700" },
  SELESAI:             { label: "Selesai",             color: "bg-teal-100 text-teal-700" },
  DIBATALKAN:          { label: "Dibatalkan",          color: "bg-gray-100 text-gray-500" },
};

const SKEMA_LABELS: Record<string, string> = {
  CASH: "Cash", KPR: "KPR", CASH_BERTAHAP: "Cash Bertahap",
};

function formatRupiah(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : val;
  if (isNaN(n)) return "-";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function BookingsContent() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  const [bookings, setBookings]     = useState<BookingItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const LIMIT = 20;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(statusFilter && { status: statusFilter }),
      });
      const res  = await fetch(`/api/bookings?${params}`);
      const json = await res.json();
      if (res.ok) {
        setBookings(json.data.bookings);
        setTotal(json.data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const totalPages = Math.ceil(total / LIMIT);

  // Hitung jumlah menunggu approval untuk badge
  const menungguApproval = bookings.filter((b) => b.status === "MENUNGGU_APPROVAL").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Daftar Booking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Memuat..." : `${total} booking total`}
            {menungguApproval > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                ⏳ {menungguApproval} menunggu approval
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => { setStatusFilter(""); setPage(1); }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!statusFilter ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Semua
        </button>
        {Object.entries(STATUS_META).map(([val, { label, color }]) => (
          <button key={val} onClick={() => { setStatusFilter(val); setPage(1); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === val ? color + " ring-1 ring-current" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-700">Belum ada booking</p>
            <p className="text-xs text-gray-500 mt-1">Buat booking dari halaman detail lead</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Customer / Lead</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Unit</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Harga Deal</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Skema</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Status</th>
                  {role !== "SALES" && (
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Sales</th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking) => {
                  const sMeta = STATUS_META[booking.status];
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {booking.lead ? (
                          <div>
                            <Link href={`/leads/${booking.lead.id}`} className="font-medium text-gray-900 hover:text-[#009182] transition-colors text-sm">
                              {booking.lead.nama}
                            </Link>
                            <p className="text-xs text-gray-500 font-mono">{booking.lead.noHp}</p>
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {booking.unit ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Blok {booking.unit.blok}-{booking.unit.noKavling}
                            </p>
                            <p className="text-xs text-gray-500">
                              {booking.unit.cluster.namaCluster} · {booking.unit.tipe}
                            </p>
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{formatRupiah(booking.hargaDeal)}</p>
                        {booking.diskonPersen > 0 && (
                          <p className="text-xs text-amber-600">Diskon {booking.diskonPersen.toFixed(1)}%</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {SKEMA_LABELS[booking.skemaPembayaran] ?? booking.skemaPembayaran}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sMeta?.color ?? "bg-gray-100 text-gray-600"}`}>
                          {sMeta?.label ?? booking.status}
                        </span>
                      </td>
                  {role !== "SALES" && (
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {booking.sales?.nama ?? "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(booking.createdAt), "d MMM yyyy", { locale: localeId })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/bookings/${booking.id}`}
                          className="text-xs text-[#009182] hover:text-[#007a6e] font-medium whitespace-nowrap">
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="px-3 py-1 text-xs text-gray-700">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    }>
      <BookingsContent />
    </Suspense>
  );
}
