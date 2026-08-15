"use client";

/**
 * DashboardSalesExec — dashboard untuk Sales Executive
 * PRD 5.8: jumlah lead per status + daftar perlu follow-up
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface LeadStatus { status: string; count: number; }
interface SlaLead {
  id: string; nama: string; noHp: string;
  statusPipeline: string; updatedAt: string;
  minatCluster: { namaCluster: string } | null;
}
interface ReminderItem {
  id: string; reminderAt: string; ringkasan: string;
  lead: {
    id: string; nama: string; noHp: string;
    statusPipeline: string;
    minatCluster: { namaCluster: string } | null;
  };
}
interface DashboardSalesData {
  leadsByStatus: LeadStatus[];
  totalAktif: number;
  slaLeads: SlaLead[];
  reminders: ReminderItem[];
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  BARU:        { label: "Baru",        color: "text-blue-700",   bg: "bg-blue-50",   bar: "bg-blue-400" },
  DIHUBUNGI:   { label: "Dihubungi",   color: "text-sky-700",    bg: "bg-sky-50",    bar: "bg-sky-400" },
  KUALIFIKASI: { label: "Kualifikasi", color: "text-purple-700", bg: "bg-purple-50", bar: "bg-purple-400" },
  SITE_VISIT:  { label: "Site Visit",  color: "text-orange-700", bg: "bg-orange-50", bar: "bg-orange-400" },
  NEGOSIASI:   { label: "Negosiasi",   color: "text-amber-700",  bg: "bg-amber-50",  bar: "bg-amber-400" },
  BOOKING:     { label: "Booking",     color: "text-teal-700",   bg: "bg-teal-50",   bar: "bg-teal-400" },
  CLOSING:     { label: "Closing",     color: "text-green-700",  bg: "bg-green-50",  bar: "bg-green-400" },
  LOST:        { label: "Lost",        color: "text-red-700",    bg: "bg-red-50",    bar: "bg-red-400" },
};

// ---------------------------------------------------------------------------

export default function DashboardSalesExec({ userName }: { userName: string }) {
  const [data, setData]       = useState<DashboardSalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/sales")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const perluFollowUp = [
    ...(data?.reminders ?? []).map((r) => ({
      type: "reminder" as const,
      leadId: r.lead.id,
      leadNama: r.lead.nama,
      leadStatus: r.lead.statusPipeline,
      minatCluster: r.lead.minatCluster?.namaCluster,
      keterangan: `Reminder: ${r.ringkasan}`,
      waktu: r.reminderAt,
    })),
    ...(data?.slaLeads ?? []).map((l) => ({
      type: "sla" as const,
      leadId: l.id,
      leadNama: l.nama,
      leadStatus: l.statusPipeline,
      minatCluster: l.minatCluster?.namaCluster,
      keterangan: `Tidak ada aktivitas sejak ${formatDistanceToNow(new Date(l.updatedAt), { locale: localeId, addSuffix: true })}`,
      waktu: l.updatedAt,
    })),
  ];

  const totalAktif = data?.totalAktif ?? 0;
  const maxCount   = Math.max(...(data?.leadsByStatus ?? []).map((l) => l.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Selamat datang, {userName.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading ? "Memuat data..." : `${totalAktif} lead aktif saat ini`}
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Stats: Lead per status                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Lead per Status Pipeline</h2>
          <Link href="/leads" className="text-xs text-[#009182] hover:underline">
            Lihat semua →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {(data?.leadsByStatus ?? [])
              .filter((l) => l.count > 0)
              .sort((a, b) => {
                const order = ["BARU","DIHUBUNGI","KUALIFIKASI","SITE_VISIT","NEGOSIASI","BOOKING","CLOSING","LOST"];
                return order.indexOf(a.status) - order.indexOf(b.status);
              })
              .map((item) => {
                const meta = STATUS_META[item.status];
                const pct  = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className={`w-20 text-xs font-medium ${meta?.color ?? "text-gray-600"} flex-shrink-0`}>
                      {meta?.label ?? item.status}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta?.bar ?? "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs font-semibold text-gray-700 text-right flex-shrink-0">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            {(data?.leadsByStatus ?? []).filter((l) => l.count > 0).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada lead</p>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Daftar Perlu Follow-up Hari Ini                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Perlu Follow-up</h2>
            {perluFollowUp.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                {perluFollowUp.length}
              </span>
            )}
          </div>
          <Link href="/leads" className="text-xs text-[#009182] hover:underline">
            Semua leads →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : perluFollowUp.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Semua lead sudah di-follow-up</p>
            <p className="text-xs text-gray-500 mt-1">Tidak ada reminder atau lead yang perlu perhatian hari ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {perluFollowUp.map((item, idx) => {
              const statusMeta = STATUS_META[item.leadStatus];
              return (
                <Link
                  key={`${item.type}-${idx}`}
                  href={`/leads/${item.leadId}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#009182]/30 hover:bg-teal-50/30 transition-colors group"
                >
                  {/* Ikon tipe */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === "reminder" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                  }`}>
                    {item.type === "reminder" ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    )}
                  </div>

                  {/* Info lead */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#009182] transition-colors">
                        {item.leadNama}
                      </p>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium ${statusMeta?.bg} ${statusMeta?.color}`}>
                        {statusMeta?.label ?? item.leadStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.keterangan}
                      {item.minatCluster && ` · ${item.minatCluster}`}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#009182] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
