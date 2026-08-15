"use client";

/**
 * DashboardAdmin — dashboard operasional untuk role Admin
 * PRD 5.8: booking menunggu diproses, transaksi perlu perhatian,
 *          ringkasan jumlah booking per tahap checklist
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface BookingMenunggu {
  id: string; createdAt: string; updatedAt: string;
  currentTahap: number; completedCount: number; totalTahap: number;
  lead:  { id: string; nama: string; noHp: string } | null;
  unit:  { blok: string; noKavling: string; tipe: string; cluster: { namaCluster: string } } | null;
  sales: { nama: string } | null;
}

interface ChecklistMacet {
  id: string; tahap: number; namaTahap: string; status: string;
  updatedAt: string; targetDate: string | null; catatan: string | null;
  hariMacet: number;
  booking: {
    id: string;
    lead:  { id: string; nama: string } | null;
    unit:  { blok: string; noKavling: string; cluster: { namaCluster: string } } | null;
    sales: { nama: string } | null;
  };
}

interface RingkasanTahap {
  tahap: number;
  namaTahap: string;
  BELUM_MULAI?: number;
  DIPROSES?: number;
  SELESAI?: number;
  BERMASALAH?: number;
}

interface AdminData {
  bookingMenunggu: BookingMenunggu[];
  checklistMacet:  ChecklistMacet[];
  macetCount:      number;
  ringkasanPerTahap: RingkasanTahap[];
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const TAHAP_STATUS_META: Record<string, { color: string; bg: string }> = {
  BELUM_MULAI: { color: "text-gray-500",  bg: "bg-gray-100" },
  DIPROSES:    { color: "text-blue-700",  bg: "bg-blue-100" },
  SELESAI:     { color: "text-green-700", bg: "bg-green-100" },
  BERMASALAH:  { color: "text-red-700",   bg: "bg-red-100" },
};

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function DashboardAdmin({ userName }: { userName: string }) {
  const [data, setData]       = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Selamat datang, {userName.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading ? "Memuat..." : (
            <>
              {data?.bookingMenunggu.length ?? 0} booking menunggu diproses
              {(data?.macetCount ?? 0) > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                  ⚠ {data!.macetCount} perlu perhatian
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Ringkasan per tahap checklist                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Ringkasan Proses Transaksi</h2>
          <Link href="/bookings" className="text-xs text-[#009182] hover:underline">
            Semua booking →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.ringkasanPerTahap ?? []).map((tahap) => {
              const total = (tahap.BELUM_MULAI ?? 0) + (tahap.DIPROSES ?? 0) +
                            (tahap.SELESAI ?? 0) + (tahap.BERMASALAH ?? 0);
              if (total === 0) return null;

              const bermasalah = tahap.BERMASALAH ?? 0;
              const diproses   = tahap.DIPROSES ?? 0;

              return (
                <div key={tahap.tahap}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    bermasalah > 0
                      ? "border-red-200 bg-red-50"
                      : diproses > 0
                        ? "border-blue-100 bg-blue-50/50"
                        : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    bermasalah > 0 ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
                  }`}>
                    {tahap.tahap}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{tahap.namaTahap}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {bermasalah > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        {bermasalah} bermasalah
                      </span>
                    )}
                    {diproses > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {diproses} diproses
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{total} total</span>
                  </div>
                </div>
              );
            })}
            {(data?.ringkasanPerTahap ?? []).every((t) =>
              ((t.BELUM_MULAI ?? 0) + (t.DIPROSES ?? 0) + (t.SELESAI ?? 0) + (t.BERMASALAH ?? 0)) === 0
            ) && (
              <p className="text-xs text-gray-500 text-center py-4">Belum ada booking yang diproses</p>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Booking menunggu diproses                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Booking Menunggu Diproses</h2>
            {(data?.bookingMenunggu.length ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                {data!.bookingMenunggu.length}
              </span>
            )}
          </div>
          <Link href="/bookings?status=DISETUJUI" className="text-xs text-[#009182] hover:underline">
            Lihat semua →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (data?.bookingMenunggu ?? []).length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">Semua booking sudah diproses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data!.bookingMenunggu.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#009182]/30 hover:bg-teal-50/30 transition-colors group"
              >
                {/* Progress ring sederhana */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-50 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-teal-700 leading-none">{b.completedCount}</span>
                  <span className="text-[9px] text-teal-500 leading-none">/{b.totalTahap}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#009182] transition-colors">
                      {b.lead?.nama ?? "—"}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      Tahap {b.currentTahap}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {b.unit ? `Blok ${b.unit.blok}-${b.unit.noKavling} · ${b.unit.cluster.namaCluster}` : "—"}
                    {b.sales && ` · ${b.sales.nama}`}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(b.updatedAt), { addSuffix: true, locale: localeId })}
                  </p>
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009182] ml-auto mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Transaksi Perlu Perhatian (tahap macet)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Perlu Perhatian</h2>
            {(data?.macetCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                ⚠ {data!.macetCount}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">Tahap tidak berubah &gt; 7 hari</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (data?.checklistMacet ?? []).length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">Tidak ada transaksi yang macet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data!.checklistMacet.map((item) => {
              const sMeta = TAHAP_STATUS_META[item.status] ?? TAHAP_STATUS_META.BERMASALAH;
              return (
                <Link
                  key={item.id}
                  href={`/bookings/${item.booking.id}`}
                  className="flex items-start gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50/30 hover:border-orange-300 hover:bg-orange-50 transition-colors group"
                >
                  {/* Badge hari macet */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-orange-100 text-orange-700">
                    <span className="text-sm font-bold leading-none">{item.hariMacet}</span>
                    <span className="text-[9px] leading-none mt-0.5">hari</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#009182] transition-colors">
                        {item.booking.lead?.nama ?? "—"}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sMeta.bg} ${sMeta.color}`}>
                        {item.status === "BERMASALAH" ? "Bermasalah" : "Diproses"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Tahap {item.tahap}: <span className="font-medium">{item.namaTahap}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.booking.unit
                        ? `Blok ${item.booking.unit.blok}-${item.booking.unit.noKavling} · ${item.booking.unit.cluster.namaCluster}`
                        : "—"}
                      {item.booking.sales && ` · ${item.booking.sales.nama}`}
                    </p>
                    {item.targetDate && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Target: {format(new Date(item.targetDate), "d MMM yyyy", { locale: localeId })}
                      </p>
                    )}
                  </div>

                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-500 flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
