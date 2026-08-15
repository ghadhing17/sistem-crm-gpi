"use client";

/**
 * Halaman /units/[clusterId]/[unitId] — Detail Unit
 * PRD 5.4: spesifikasi unit, harga, status, riwayat booking
 */

import { useState, useEffect, useTransition, Suspense } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { canManageInventory, canRequestUnitHold } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface BookingRingkas {
  id: string; status: string; createdAt: string;
  lead: { id: string; nama: string; noHp: string } | null;
  sales: { id: string; nama: string } | null;
}
interface UnitDetail {
  id: string; blok: string; noKavling: string; tipe: string;
  luasTanah: number; luasBangunan: number; harga: string;
  status: string; deskripsi: string | null;
  createdAt: string; updatedAt: string;
  cluster: { id: string; namaCluster: string; lokasi: string };
  bookings: BookingRingkas[];
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  TERSEDIA:     { label: "Tersedia",     bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  border: "border-green-200" },
  NEGOSIASI:    { label: "Negosiasi",    bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500", border: "border-yellow-200" },
  BOOKED:       { label: "Booked",       bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200" },
  TERJUAL:      { label: "Terjual",      bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    border: "border-red-200" },
  TIDAK_DIJUAL: { label: "Tidak Dijual", bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400",   border: "border-gray-200" },
};

const STATUS_OPTIONS = ["TERSEDIA","NEGOSIASI","BOOKED","TERJUAL","TIDAK_DIJUAL"] as const;

const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: "Draft",               color: "bg-gray-100 text-gray-600" },
  MENUNGGU_APPROVAL:   { label: "Menunggu Approval",   color: "bg-amber-100 text-amber-700" },
  DISETUJUI:           { label: "Disetujui",           color: "bg-green-100 text-green-700" },
  DITOLAK:             { label: "Ditolak",             color: "bg-red-100 text-red-700" },
  SELESAI:             { label: "Selesai",             color: "bg-teal-100 text-teal-700" },
  DIBATALKAN:          { label: "Dibatalkan",          color: "bg-gray-100 text-gray-500" },
};

function formatRupiah(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : val;
  if (isNaN(n)) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Halaman utama
// ---------------------------------------------------------------------------

function UnitDetailContent() {
  const params    = useParams();
  const clusterId = params.clusterId as string;
  const unitId    = params.unitId as string;
  const { data: session } = useSession();
  const role    = session?.user?.role as UserRole | undefined;
  const userId  = session?.user?.id ?? "";
  const canEdit = role ? canManageInventory({ id: userId, role }) : false;
  const canHold = role ? canRequestUnitHold({ id: userId, role }) : false;

  const [unit, setUnit]           = useState<UnitDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [statusChanging, startStatusChange] = useTransition();
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Hold state
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdLeads, setHoldLeads]         = useState<{ id: string; nama: string; noHp: string }[]>([]);
  const [holdLeadId, setHoldLeadId]       = useState("");
  const [holdJam, setHoldJam]             = useState(24);
  const [holdInfo, setHoldInfo]           = useState<{ expiredAt: string; waktuBerakhir: string } | null>(null);
  const [holdPending, startHold]          = useTransition();
  const [releasePending, startRelease]    = useTransition();

  useEffect(() => {
    fetch(`/api/units/${unitId}`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setUnit(res.data.unit); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unitId]);

  // Load leads milik user untuk dropdown hold
  useEffect(() => {
    if (!canHold) return;
    fetch(`/api/leads?limit=100${role === "SALES" ? "" : ""}`)
      .then((r) => r.json())
      .then((res) => {
        const leads = res.data?.leads ?? [];
        setHoldLeads(leads.filter((l: { statusPipeline: string }) =>
          !["LOST","CLOSING","BOOKING"].includes(l.statusPipeline)
        ));
      })
      .catch(() => {});
  }, [canHold, role]);

  function handleStatusChange(newStatus: string) {
    if (!unit || newStatus === unit.status) return;
    setError(null);
    startStatusChange(async () => {
      const res  = await fetch(`/api/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal mengubah status"); return; }
      setUnit((prev) => prev ? { ...prev, status: newStatus } : prev);
      setSuccess(`Status berhasil diubah ke "${STATUS_META[newStatus]?.label ?? newStatus}"`);
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  function handleHoldSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!holdLeadId) { setError("Pilih lead terlebih dahulu"); return; }
    setError(null);
    startHold(async () => {
      const res = await fetch(`/api/units/${unitId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: holdLeadId, durasiJam: holdJam }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal melakukan hold");
        setShowHoldModal(false);
        return;
      }
      setUnit((prev) => prev ? { ...prev, status: "NEGOSIASI" } : prev);
      setHoldInfo({ expiredAt: json.data.holdExpiredAt, waktuBerakhir: json.data.waktuBerakhir });
      setSuccess(`Unit berhasil di-hold. Hold berakhir pada ${json.data.waktuBerakhir}`);
      setShowHoldModal(false);
      setTimeout(() => setSuccess(null), 5000);
    });
  }

  function handleReleaseHold() {
    setError(null);
    startRelease(async () => {
      const res  = await fetch(`/api/units/${unitId}/hold`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal melepas hold"); return; }
      setUnit((prev) => prev ? { ...prev, status: "TERSEDIA" } : prev);
      setHoldInfo(null);
      setSuccess("Hold berhasil dilepas. Unit kembali ke status Tersedia.");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="ml-2 text-sm text-gray-500">Memuat detail unit...</span>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Unit tidak ditemukan</p>
        <Link href={`/units/${clusterId}`} className="mt-2 text-xs text-[#009182] hover:underline">
          Kembali ke daftar unit
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[unit.status];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5 flex-wrap">
        <Link href="/units" className="hover:text-[#009182] transition-colors">Unit & Inventory</Link>
        <span>/</span>
        <Link href={`/units/${clusterId}`} className="hover:text-[#009182] transition-colors">{unit.cluster.namaCluster}</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Blok {unit.blok}-{unit.noKavling}</span>
      </div>

      {/* Alert */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700" role="status">
          {success}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Header unit                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Blok {unit.blok}-{unit.noKavling}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{unit.cluster.namaCluster} · {unit.tipe}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusMeta.bg} ${statusMeta.border}`}>
            <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
            <span className={`text-sm font-medium ${statusMeta.text}`}>{statusMeta.label}</span>
          </div>
        </div>

        {/* Grid spesifikasi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Harga</p>
            <p className="text-sm font-semibold text-gray-900">{formatRupiah(unit.harga)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Tipe</p>
            <p className="text-sm font-semibold text-gray-900">{unit.tipe}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Luas Tanah</p>
            <p className="text-sm font-semibold text-gray-900">{unit.luasTanah} m²</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Luas Bangunan</p>
            <p className="text-sm font-semibold text-gray-900">{unit.luasBangunan} m²</p>
          </div>
        </div>

        {unit.deskripsi && (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
            {unit.deskripsi}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Update Status — hanya Admin BO                                       */}
      {/* ------------------------------------------------------------------ */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Update Status Unit</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const meta = STATUS_META[s];
              const isActive = unit.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isActive || statusChanging}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all disabled:cursor-not-allowed ${
                    isActive
                      ? `${meta.bg} ${meta.border} ${meta.text} border-2`
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white disabled:opacity-40"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                  {isActive && (
                    <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {statusChanging && (
            <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Menyimpan...
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Hold Sementara — Sales Exec & Manager (PRD 6.2 langkah 3 & 6.6)   */}
      {/* ------------------------------------------------------------------ */}
      {canHold && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Hold Sementara</h2>
            {unit.status === "NEGOSIASI" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 border border-yellow-200 text-xs font-medium text-yellow-800">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Unit sedang di-hold
              </span>
            )}
          </div>

          {unit.status === "TERSEDIA" ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 flex-1">
                Hold unit ini ke lead tertentu selama negosiasi berlangsung. Unit otomatis kembali ke "Tersedia" jika hold habis.
              </p>
              <button
                onClick={() => setShowHoldModal(true)}
                disabled={holdPending}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Hold Sementara
              </button>
            </div>
          ) : unit.status === "NEGOSIASI" ? (
            <div className="space-y-3">
              {holdInfo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-800">
                    Hold aktif hingga <span className="font-semibold">{holdInfo.waktuBerakhir}</span>
                    {" "}({formatDistanceToNow(new Date(holdInfo.expiredAt), { addSuffix: true, locale: localeId })})
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHoldModal(true)}
                  disabled={holdPending || releasePending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  Perpanjang Hold
                </button>
                <button
                  onClick={handleReleaseHold}
                  disabled={releasePending || holdPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {releasePending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Melepas...
                    </>
                  ) : "Lepas Hold"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Unit tidak bisa di-hold karena statusnya adalah "{STATUS_META[unit.status]?.label ?? unit.status}".
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Riwayat Booking                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Riwayat Booking</h2>
        {unit.bookings.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-gray-500">Belum ada booking untuk unit ini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unit.bookings.map((booking) => {
              const bMeta = BOOKING_STATUS_LABELS[booking.status];
              return (
                <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {booking.lead && (
                        <Link href={`/leads/${booking.lead.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#009182] transition-colors">
                          {booking.lead.nama}
                        </Link>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bMeta?.color ?? "bg-gray-100 text-gray-600"}`}>
                        {bMeta?.label ?? booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                      {booking.sales && <span>Sales: {booking.sales.nama}</span>}
                      <span>·</span>
                      <span>{format(new Date(booking.createdAt), "d MMM yyyy", { locale: localeId })}</span>
                    </div>
                  </div>
                  <Link href={`/bookings/${booking.id}`}
                    className="text-xs text-[#009182] hover:text-[#007a6e] font-medium whitespace-nowrap flex-shrink-0">
                    Detail →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        Ditambahkan {format(new Date(unit.createdAt), "d MMM yyyy", { locale: localeId })}
        {" · "}Diperbarui {format(new Date(unit.updatedAt), "d MMM yyyy, HH:mm", { locale: localeId })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal Hold Sementara                                                  */}
      {/* ------------------------------------------------------------------ */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Hold Sementara Unit</h2>
              <button onClick={() => setShowHoldModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleHoldSubmit} className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Hold unit <strong>Blok {unit.blok}-{unit.noKavling}</strong> ke lead tertentu selama negosiasi berlangsung. Unit otomatis kembali ke &quot;Tersedia&quot; jika hold habis.
                </p>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Lead <span className="text-red-500">*</span>
                </label>
                <select
                  value={holdLeadId}
                  onChange={(e) => setHoldLeadId(e.target.value)}
                  disabled={holdPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
                >
                  <option value="">Pilih lead...</option>
                  {holdLeads.map((l) => (
                    <option key={l.id} value={l.id}>{l.nama} — {l.noHp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Durasi Hold
                </label>
                <div className="flex gap-2">
                  {[6, 12, 24, 48].map((jam) => (
                    <button
                      key={jam}
                      type="button"
                      onClick={() => setHoldJam(jam)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        holdJam === jam
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {jam}j
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Hold berakhir otomatis setelah {holdJam} jam jika tidak lanjut ke booking
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowHoldModal(false)} disabled={holdPending}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={holdPending || !holdLeadId}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {holdPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Menyimpan...
                    </>
                  ) : `Hold ${holdJam} Jam`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnitDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    }>
      <UnitDetailContent />
    </Suspense>
  );
}
