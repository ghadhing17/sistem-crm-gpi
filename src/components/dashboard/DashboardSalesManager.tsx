"use client";

/**
 * DashboardSalesManager — dashboard untuk Sales Manager & Super Admin
 * PRD 5.8: funnel konversi tim + lead belum di-assign + modal assign
 * PRD 6.1 langkah 5-6: modal assign dengan dropdown sales + workload indicator
 */

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { notifLeadDiassign } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface FunnelItem { status: string; count: number; }
interface UnassignedLead {
  id: string; nama: string; noHp: string; sumber: string;
  statusPipeline: string; tagKualifikasi: string | null;
  createdAt: string;
  minatCluster: { namaCluster: string } | null;
  minatTipe: string | null;
}
interface SalesWorkload { id: string; nama: string; role: string; leadAktif: number; }
interface ManagerData {
  funnel: FunnelItem[];
  unassignedLeads: UnassignedLead[];
  unassignedCount: number;
  salesWorkload: SalesWorkload[];
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const FUNNEL_STEPS = [
  { status: "BARU",        label: "Baru",      color: "bg-blue-400" },
  { status: "DIHUBUNGI",   label: "Dihubungi", color: "bg-sky-400" },
  { status: "KUALIFIKASI", label: "Kualifikasi", color: "bg-purple-400" },
  { status: "SITE_VISIT",  label: "Site Visit",color: "bg-orange-400" },
  { status: "NEGOSIASI",   label: "Negosiasi", color: "bg-amber-400" },
  { status: "BOOKING",     label: "Booking",   color: "bg-teal-400" },
  { status: "CLOSING",     label: "Closing",   color: "bg-green-400" },
];

const SUMBER_LABELS: Record<string, string> = {
  WHATSAPP: "WA", TELEPON: "Telp", WEBSITE: "Web",
  FACEBOOK_ADS: "FB Ads", GOOGLE_ADS: "Google", PAMERAN: "Pameran",
  REFERRAL: "Referral", INSTAGRAM: "IG", LAINNYA: "Lainnya",
};

// ---------------------------------------------------------------------------
// Modal Assign Lead
// ---------------------------------------------------------------------------

interface AssignModalProps {
  lead: UnassignedLead;
  salesList: SalesWorkload[];
  onAssign: (leadId: string, salesId: string, salesNama: string) => void;
  onTutup: () => void;
}

function AssignModal({ lead, salesList, onAssign, onTutup }: AssignModalProps) {
  const [selectedSalesId, setSelectedSalesId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedSalesId) { setError("Pilih sales terlebih dahulu"); return; }
    const salesNama = salesList.find((s) => s.id === selectedSalesId)?.nama ?? "";
    startTransition(async () => {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesPicId: selectedSalesId }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Gagal assign lead");
        return;
      }
      onAssign(lead.id, selectedSalesId, salesNama);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-title"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 id="assign-title" className="text-sm font-semibold text-gray-900 mb-0.5">
            Assign Lead
          </h2>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{lead.nama}</span>
            {" · "}{lead.noHp}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Pilih Sales PIC <span className="text-red-500">*</span>
          </p>

          {/* Daftar sales dengan workload indicator */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {salesList.map((sales) => (
              <button
                key={sales.id}
                type="button"
                onClick={() => { setSelectedSalesId(sales.id); setError(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-left ${
                  selectedSalesId === sales.id
                    ? "border-[#009182] bg-teal-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-teal-700">
                      {sales.nama.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{sales.nama}</p>
                    <p className="text-xs text-gray-400">
                      {sales.role.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Workload indicator */}
                <div className="flex items-center gap-1.5">
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    sales.leadAktif >= 20
                      ? "bg-red-100 text-red-700"
                      : sales.leadAktif >= 10
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}>
                    {sales.leadAktif} lead
                  </div>
                  {selectedSalesId === sales.id && (
                    <svg className="w-4 h-4 text-[#009182]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onTutup}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isPending || !selectedSalesId}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Menyimpan...
              </>
            ) : "Assign Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function DashboardSalesManager({ userName }: { userName: string }) {
  const [data, setData]           = useState<ManagerData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [assignTarget, setAssignTarget] = useState<UnassignedLead | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/manager")
      .then((r) => r.json())
      .then((res) => { if (res.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAssignDone(leadId: string, salesId: string, salesNama: string) {
    // Update state lokal optimistis — hapus dari daftar unassigned
    setData((prev) => {
      if (!prev) return prev;
      const updated = prev.unassignedLeads.filter((l) => l.id !== leadId);
      const updatedWorkload = prev.salesWorkload.map((s) =>
        s.id === salesId ? { ...s, leadAktif: s.leadAktif + 1 } : s
      );
      return {
        ...prev,
        unassignedLeads: updated,
        unassignedCount: updated.length,
        salesWorkload: updatedWorkload,
      };
    });
    setAssignTarget(null);
  }

  const maxFunnelCount = Math.max(...(data?.funnel ?? []).map((f) => f.count), 1);
  const totalLead = data?.funnel.reduce((s, f) => s + f.count, 0) ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Selamat datang, {userName.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {loading ? "Memuat data..." : `${totalLead} total lead di semua status`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------------------------------------------------------- */}
        {/* Kolom kiri: Funnel konversi tim                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Funnel Konversi Tim</h2>
            <Link href="/leads" className="text-xs text-[#009182] hover:underline">
              Lihat pipeline →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {FUNNEL_STEPS.map((step, idx) => {
                const item  = data?.funnel.find((f) => f.status === step.status);
                const count = item?.count ?? 0;
                const prev  = idx > 0
                  ? (data?.funnel.find((f) => f.status === FUNNEL_STEPS[idx - 1].status)?.count ?? 1)
                  : count;
                const dropPct = idx > 0 && prev > 0
                  ? Math.round(((prev - count) / prev) * 100)
                  : null;
                const barWidth = Math.round((count / maxFunnelCount) * 100);

                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-gray-600 flex-shrink-0">{step.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${step.color} flex items-center`}
                        style={{ width: `${barWidth}%`, minWidth: count > 0 ? "2rem" : "0" }}
                      >
                        {count > 0 && (
                          <span className="ml-2 text-xs font-semibold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                    {dropPct !== null && dropPct > 0 && (
                      <span className="w-14 text-xs text-red-500 flex-shrink-0 text-right">
                        -{dropPct}%
                      </span>
                    )}
                    {(dropPct === null || dropPct === 0) && (
                      <span className="w-14 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Closing summary */}
          {!loading && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Closing bulan ini:{" "}
                <span className="font-semibold text-green-700">
                  {data?.funnel.find((f) => f.status === "CLOSING")?.count ?? 0}
                </span>
              </span>
              <span>
                Lead unassigned:{" "}
                <span className={`font-semibold ${(data?.unassignedCount ?? 0) > 0 ? "text-amber-600" : "text-green-700"}`}>
                  {data?.unassignedCount ?? 0}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Kolom kanan: Workload per sales                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Beban Kerja Sales</h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (data?.salesWorkload ?? []).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Belum ada sales terdaftar</p>
          ) : (
            <div className="space-y-2">
              {(data?.salesWorkload ?? []).map((sales) => (
                <div key={sales.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-teal-700">
                        {sales.nama.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate max-w-[100px]">
                      {sales.nama}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    sales.leadAktif >= 20
                      ? "bg-red-100 text-red-700"
                      : sales.leadAktif >= 10
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}>
                    {sales.leadAktif}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lead Belum Ditugaskan                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Lead Belum Ditugaskan</h2>
            {(data?.unassignedCount ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                {data!.unassignedCount}
              </span>
            )}
          </div>
          <Link href="/leads?status=BARU" className="text-xs text-[#009182] hover:underline">
            Semua leads →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (data?.unassignedLeads ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Semua lead sudah di-assign</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.unassignedLeads ?? []).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/30"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-amber-700">
                    {lead.nama.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-[#009182] transition-colors truncate"
                    >
                      {lead.nama}
                    </Link>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {SUMBER_LABELS[lead.sumber] ?? lead.sumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lead.minatCluster?.namaCluster ?? ""}
                    {lead.minatCluster && lead.minatTipe && " · "}
                    {lead.minatTipe ?? ""}
                    {" · Masuk "}
                    {formatDistanceToNow(new Date(lead.createdAt), { locale: localeId, addSuffix: true })}
                  </p>
                </div>

                {/* Tombol assign */}
                <button
                  onClick={() => setAssignTarget(lead)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Assign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Assign */}
      {assignTarget && data && (
        <AssignModal
          lead={assignTarget}
          salesList={data.salesWorkload}
          onAssign={handleAssignDone}
          onTutup={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
