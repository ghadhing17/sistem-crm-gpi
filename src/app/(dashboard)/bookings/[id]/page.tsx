"use client";

/**
 * Halaman /bookings/[id] — Detail Booking
 * PRD 5.6 & 6.3:
 * - Stepper vertikal 6 tahap checklist
 * - Tombol Setujui/Tolak untuk Manager
 * - Update tahap (hanya Admin)
 * - Otomasi: tahap 5 → unit TERJUAL, tahap 6 → booking SELESAI + lead CLOSING
 * - Badge "Perlu Perhatian" jika tahap macet > X hari
 */

import { useState, useEffect, useTransition, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { canApproveBooking } from "@/lib/auth/permissions";
import DocumentUploader from "@/components/documents/DocumentUploader";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

// Hari maksimum satu tahap boleh tidak berubah sebelum ditandai "Perlu Perhatian"
const MACET_HARI = parseInt(process.env.NEXT_PUBLIC_CHECKLIST_MACET_HARI ?? "7");

const TAHAP_NAMES = [
  "", // index 0 tidak dipakai
  "Pembayaran Booking Fee/DP",
  "Kelengkapan Dokumen Customer",
  "Pengajuan KPR ke Bank",
  "Status Approval Bank",
  "Penandatanganan Akad Kredit",
  "Pelunasan & Serah Terima Kunci",
];

const STATUS_BOOKING_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: "Draft",             color: "text-gray-700",   bg: "bg-gray-100" },
  MENUNGGU_APPROVAL:  { label: "Menunggu Approval", color: "text-amber-700",  bg: "bg-amber-100" },
  DISETUJUI:          { label: "Disetujui",         color: "text-green-700",  bg: "bg-green-100" },
  DITOLAK:            { label: "Ditolak",           color: "text-red-700",    bg: "bg-red-100" },
  SELESAI:            { label: "Selesai",           color: "text-teal-700",   bg: "bg-teal-100" },
  DIBATALKAN:         { label: "Dibatalkan",        color: "text-gray-500",   bg: "bg-gray-100" },
};

const STATUS_CHECKLIST_META: Record<string, {
  label: string; iconPath: string; iconBg: string; iconColor: string; border: string;
}> = {
  BELUM_MULAI: {
    label: "Belum Mulai",
    iconPath: "", // circle outline
    iconBg: "bg-gray-100", iconColor: "text-gray-400", border: "border-gray-200",
  },
  DIPROSES: {
    label: "Diproses",
    iconPath: "M12 6v6l4 2",
    iconBg: "bg-blue-100", iconColor: "text-blue-600", border: "border-blue-300",
  },
  SELESAI: {
    label: "Selesai",
    iconPath: "M5 13l4 4L19 7",
    iconBg: "bg-green-100", iconColor: "text-green-600", border: "border-green-300",
  },
  BERMASALAH: {
    label: "Bermasalah",
    iconPath: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    iconBg: "bg-red-100", iconColor: "text-red-600", border: "border-red-300",
  },
};

const STATUS_CHECKLIST_OPTIONS = ["BELUM_MULAI", "DIPROSES", "SELESAI", "BERMASALAH"] as const;
const STATUS_CHECKLIST_LABELS: Record<string, string> = {
  BELUM_MULAI: "Belum Mulai",
  DIPROSES:    "Diproses",
  SELESAI:     "Selesai",
  BERMASALAH:  "Bermasalah",
};

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string; tahap: number; namaTahap: string; status: string;
  targetDate: string | null; selesaiAt: string | null;
  catatan: string | null; updatedAt: string;
}

interface BookingDetail {
  id: string; status: string; skemaPembayaran: string;
  hargaNormal: string; hargaDeal: string; diskonPersen: number;
  alasanDiskon: string | null; alasanDitolak: string | null;
  bookingFee: string | null; targetPelunasanDp: string | null;
  approvedAt: string | null; createdAt: string; updatedAt: string;
  lead: {
    id: string; nama: string; noHp: string; email: string | null;
    minatCluster: { namaCluster: string } | null;
  } | null;
  unit: {
    id: string; blok: string; noKavling: string; tipe: string;
    luasTanah: number; luasBangunan: number; harga: string;
    cluster: { id: string; namaCluster: string; lokasi: string };
  } | null;
  sales:    { id: string; nama: string; email: string } | null;
  approver: { id: string; nama: string } | null;
  checklists: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatRupiah(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : val;
  if (isNaN(n)) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function hitungHariMacet(item: ChecklistItem): number {
  if (item.status === "SELESAI" || item.status === "BELUM_MULAI") return 0;
  return differenceInDays(new Date(), new Date(item.updatedAt));
}

// ---------------------------------------------------------------------------
// Komponen StepperItem
// ---------------------------------------------------------------------------

interface StepperItemProps {
  item: ChecklistItem;
  index: number;
  total: number;
  canEdit: boolean;
  bookingId: string;
  onUpdate: (updated: ChecklistItem) => void;
}

function StepperItem({ item, index, total, canEdit, bookingId, onUpdate }: StepperItemProps) {
  const [expanded, setExpanded]     = useState(item.status === "DIPROSES" || item.status === "BERMASALAH");
  const [editStatus, setEditStatus] = useState(item.status);
  const [editCatatan, setEditCatatan] = useState(item.catatan ?? "");
  const [editTarget, setEditTarget]   = useState(
    item.targetDate ? item.targetDate.split("T")[0] : ""
  );
  const [saving, startSave]  = useTransition();
  const [error, setError]    = useState<string | null>(null);

  const meta       = STATUS_CHECKLIST_META[item.status] ?? STATUS_CHECKLIST_META.BELUM_MULAI;
  const hariMacet  = hitungHariMacet(item);
  const perluPerhatian = hariMacet > MACET_HARI && item.status !== "SELESAI";
  const isLast     = index === total - 1;

  function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahap:      item.tahap,
          status:     editStatus,
          catatan:    editCatatan || null,
          targetDate: editTarget ? new Date(editTarget).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menyimpan"); return; }

      // Update checklist dari response
      const updated: ChecklistItem = json.data.checklist;
      onUpdate(updated);
      setExpanded(false);
    });
  }

  return (
    <div className="flex gap-4">
      {/* Garis + ikon status */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${meta.iconBg} ${meta.border}`}>
          {item.status === "BELUM_MULAI" ? (
            <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
          ) : item.status === "SELESAI" ? (
            <svg className={`w-4 h-4 ${meta.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : item.status === "DIPROSES" ? (
            <svg className={`w-4 h-4 ${meta.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className={`w-4 h-4 ${meta.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-1 ${item.status === "SELESAI" ? "bg-green-300" : "bg-gray-200"}`} />
        )}
      </div>

      {/* Konten tahap */}
      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
        {/* Header tahap */}
        <div
          className="flex items-start justify-between gap-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
          aria-expanded={expanded}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400">Tahap {item.tahap}</span>
              <span className="text-sm font-semibold text-gray-900">{item.namaTahap}</span>
              {/* Badge status */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.iconBg} ${meta.iconColor}`}>
                {meta.label}
              </span>
              {/* Badge Perlu Perhatian */}
              {perluPerhatian && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                  Perlu Perhatian ({hariMacet}h)
                </span>
              )}
            </div>
            {/* Info tanggal */}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
              {item.targetDate && (
                <span>
                  Target: {format(new Date(item.targetDate), "d MMM yyyy", { locale: localeId })}
                </span>
              )}
              {item.selesaiAt && (
                <span className="text-green-600">
                  Selesai: {format(new Date(item.selesaiAt), "d MMM yyyy", { locale: localeId })}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform mt-0.5 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Catatan singkat jika tidak expanded */}
        {!expanded && item.catatan && (
          <p className="mt-1 text-xs text-gray-500 italic line-clamp-1">{item.catatan}</p>
        )}

        {/* Panel edit — hanya tampil saat expanded */}
        {expanded && (
          <div className="mt-3 bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
            {/* Status */}
            {canEdit ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status Tahap</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_CHECKLIST_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStatus(s)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        editStatus === s
                          ? `${STATUS_CHECKLIST_META[s].iconBg} ${STATUS_CHECKLIST_META[s].iconColor} ${STATUS_CHECKLIST_META[s].border}`
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {STATUS_CHECKLIST_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 font-medium">Status</p>
                <p className={`text-sm font-semibold mt-0.5 ${meta.iconColor}`}>{meta.label}</p>
              </div>
            )}

            {/* Target date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tanggal Target{canEdit ? "" : ""}
              </label>
              {canEdit ? (
                <input
                  type="date"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182]"
                />
              ) : (
                <p className="text-sm text-gray-700">
                  {item.targetDate ? format(new Date(item.targetDate), "d MMM yyyy", { locale: localeId }) : "—"}
                </p>
              )}
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
              {canEdit ? (
                <textarea
                  rows={3}
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Catatan, info bank, nomor dokumen, dll."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] resize-none"
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.catatan ?? <span className="text-gray-400 italic">Belum ada catatan</span>}
                </p>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {/* Tombol simpan */}
            {canEdit && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditStatus(item.status);
                    setEditCatatan(item.catatan ?? "");
                    setEditTarget(item.targetDate ? item.targetDate.split("T")[0] : "");
                    setExpanded(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menyimpan...</>
                  ) : "Simpan Perubahan"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Halaman utama
// ---------------------------------------------------------------------------

function BookingDetailContent() {
  const params    = useParams();
  const bookingId = params.id as string;
  const { data: session } = useSession();
  const role      = session?.user?.role as UserRole | undefined;
  const canApprove = role ? canApproveBooking({ id: session!.user.id, role }) : false;
  const canEditChecklist = role === "ADMIN" || role === "SUPER_ADMIN";

  const [booking, setBooking]   = useState<BookingDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showTolakModal, setShowTolakModal]         = useState(false);
  const [showBatalkanModal, setShowBatalkanModal]   = useState(false);
  const [alasanTolak, setAlasanTolak]               = useState("");
  const [alasanBatalkan, setAlasanBatalkan]         = useState("");
  const [approvePending, startApprove]              = useTransition();
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // Siapa yang boleh batalkan: sales pemilik atau Manager/Super Admin
  const userId     = session?.user?.id ?? "";
  const canBatalkan = booking && role && (
    role === "MANAGER" || role === "SUPER_ADMIN" ||
    booking.sales?.id === userId
  ) && !["SELESAI", "DITOLAK", "DIBATALKAN"].includes(booking.status);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/bookings/${bookingId}`);
      const json = await res.json();
      if (res.ok) setBooking(json.data.booking);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  function handleApprove() {
    setError(null);
    startApprove(async () => {
      const res  = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi: "setujui" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menyetujui booking"); return; }
      setBooking(json.data.booking);
      setSuccess("Booking disetujui. Unit telah berubah ke status Booked dan checklist 6 tahap telah dibuat.");
      setTimeout(() => setSuccess(null), 6000);
    });
  }

  function handleBatalkan(e: React.FormEvent) {
    e.preventDefault();
    if (!alasanBatalkan.trim()) { setError("Alasan pembatalan wajib diisi"); return; }
    setError(null);
    startApprove(async () => {
      const res  = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi: "batalkan", alasanBatalkan }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal membatalkan booking"); return; }
      setBooking(json.data.booking);
      setShowBatalkanModal(false);
      setAlasanBatalkan("");
      setSuccess("Booking telah dibatalkan.");
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  function handleTolak(e: React.FormEvent) {
    e.preventDefault();
    if (!alasanTolak.trim()) { setError("Alasan penolakan wajib diisi"); return; }
    setError(null);
    startApprove(async () => {
      const res  = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi: "tolak", alasanDitolak: alasanTolak }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menolak booking"); return; }
      setBooking(json.data.booking);
      setShowTolakModal(false);
      setAlasanTolak("");
      setSuccess("Booking ditolak. Sales akan mendapat notifikasi.");
      setTimeout(() => setSuccess(null), 5000);
    });
  }

  function handleChecklistUpdate(updated: ChecklistItem) {
    setBooking((prev) => {
      if (!prev) return prev;
      const checklists = prev.checklists.map((c) =>
        c.tahap === updated.tahap ? updated : c
      );
      // Jika tahap 6 selesai, update status booking juga
      const allDone = checklists.every((c) => c.status === "SELESAI");
      return {
        ...prev,
        checklists,
        status: updated.tahap === 6 && updated.status === "SELESAI" ? "SELESAI" : prev.status,
      };
    });
    if (updated.tahap === 6 && updated.status === "SELESAI") {
      setSuccess("Serah Terima selesai! Booking berstatus Selesai dan lead otomatis Closing.");
      setTimeout(() => setSuccess(null), 6000);
    } else if (updated.tahap === 5 && updated.status === "SELESAI") {
      setSuccess("Akad Kredit selesai. Unit telah otomatis berubah ke status Terjual.");
      setTimeout(() => setSuccess(null), 5000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="ml-2 text-sm text-gray-500">Memuat detail booking...</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Booking tidak ditemukan</p>
        <Link href="/bookings" className="mt-2 text-xs text-[#009182] hover:underline">Kembali ke daftar</Link>
      </div>
    );
  }

  const sMeta = STATUS_BOOKING_META[booking.status];
  const totalPerluPerhatian = booking.checklists.filter((c) => hitungHariMacet(c) > MACET_HARI && c.status !== "SELESAI").length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
        <Link href="/bookings" className="hover:text-[#009182] transition-colors">Bookings</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-[200px]">
          {booking.lead?.nama ?? bookingId.slice(0, 8)}
        </span>
      </div>

      {/* Alert */}
      {error   && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}</div>}
      {success && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700" role="status">{success}</div>}

      {/* ---------------------------------------------------------------- */}
      {/* Header + Status                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{booking.lead?.nama ?? "—"}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.unit
                ? `Unit Blok ${booking.unit.blok}-${booking.unit.noKavling} · ${booking.unit.cluster.namaCluster}`
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {totalPerluPerhatian > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                {totalPerluPerhatian} Perlu Perhatian
              </span>
            )}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sMeta.bg} ${sMeta.color}`}>
              {sMeta.label}
            </span>
          </div>
        </div>

        {/* Grid info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Harga Normal</p>
            <p className="text-sm font-semibold text-gray-900">{formatRupiah(booking.hargaNormal)}</p>
          </div>
          <div className={`rounded-xl p-3 ${booking.diskonPersen > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-500 mb-1">Harga Deal</p>
            <p className="text-sm font-semibold text-gray-900">{formatRupiah(booking.hargaDeal)}</p>
            {booking.diskonPersen > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">Diskon {booking.diskonPersen.toFixed(1)}%</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Skema</p>
            <p className="text-sm font-semibold text-gray-900">
              {{ CASH: "Cash", KPR: "KPR", CASH_BERTAHAP: "Cash Bertahap" }[booking.skemaPembayaran] ?? booking.skemaPembayaran}
            </p>
          </div>
          {booking.bookingFee && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Booking Fee</p>
              <p className="text-sm font-semibold text-gray-900">{formatRupiah(booking.bookingFee)}</p>
            </div>
          )}
          {booking.targetPelunasanDp && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Target Pelunasan DP</p>
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(booking.targetPelunasanDp), "d MMM yyyy", { locale: localeId })}
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Sales PIC</p>
            <p className="text-sm font-semibold text-gray-900">{booking.sales?.nama ?? "—"}</p>
          </div>
        </div>

        {booking.alasanDiskon && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-medium text-amber-800 mb-0.5">Alasan Diskon</p>
            <p className="text-xs text-amber-700">{booking.alasanDiskon}</p>
          </div>
        )}
        {booking.alasanDitolak && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-medium text-red-800 mb-0.5">Alasan Ditolak</p>
            <p className="text-xs text-red-700">{booking.alasanDitolak}</p>
          </div>
        )}
        {booking.approvedAt && booking.approver && (
          <p className="mt-4 text-xs text-gray-500">
            Disetujui oleh <span className="font-medium text-gray-700">{booking.approver.nama}</span>
            {" pada "}
            {format(new Date(booking.approvedAt), "d MMM yyyy, HH:mm", { locale: localeId })}
          </p>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Tombol Approval (Manager saat MENUNGGU_APPROVAL)                  */}
      {/* ---------------------------------------------------------------- */}
      {canApprove && booking.status === "MENUNGGU_APPROVAL" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-amber-900 mb-1">Perlu Persetujuan Anda</h2>
          <p className="text-xs text-amber-700 mb-4 leading-relaxed">
            Booking ini membutuhkan approval karena diskon{" "}
            <strong>{booking.diskonPersen.toFixed(1)}%</strong> melebihi batas standar.
            Setelah disetujui, checklist 6 tahap proses transaksi akan dibuat secara otomatis.
          </p>
          <div className="flex gap-3">
            <button onClick={handleApprove} disabled={approvePending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {approvePending
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
              Setujui Booking
            </button>
            <button onClick={() => setShowTolakModal(true)} disabled={approvePending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Tolak Booking
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Info Unit                                                         */}
      {/* ---------------------------------------------------------------- */}
      {/* Tombol Batalkan — Sales pemilik atau Manager, status bukan final */}
      {canBatalkan && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Batalkan Booking</p>
            <p className="text-xs text-gray-500 mt-0.5">Booking akan berubah ke status Dibatalkan. Tindakan ini tidak bisa dibalik.</p>
          </div>
          <button
            onClick={() => setShowBatalkanModal(true)}
            disabled={approvePending}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Batalkan Booking
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Info Unit                                                         */}
      {/* ---------------------------------------------------------------- */}
      {booking.unit && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Detail Unit</h2>
            <Link href={`/units/${booking.unit.cluster.id}/${booking.unit.id}`}
              className="text-xs text-[#009182] hover:underline">Lihat unit →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><p className="text-xs text-gray-500">Cluster</p><p className="text-sm font-medium text-gray-800">{booking.unit.cluster.namaCluster}</p></div>
            <div><p className="text-xs text-gray-500">Blok/Kavling</p><p className="text-sm font-medium text-gray-800">Blok {booking.unit.blok}-{booking.unit.noKavling}</p></div>
            <div><p className="text-xs text-gray-500">Tipe</p><p className="text-sm font-medium text-gray-800">{booking.unit.tipe}</p></div>
            <div><p className="text-xs text-gray-500">Luas</p><p className="text-sm font-medium text-gray-800">{booking.unit.luasTanah}m² / {booking.unit.luasBangunan}m²</p></div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Stepper Checklist 6 Tahap — PRD 5.6                              */}
      {/* ---------------------------------------------------------------- */}
      {["DISETUJUI", "SELESAI"].includes(booking.status) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Checklist Proses Transaksi</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {canEditChecklist ? "Admin dapat mengklik tiap tahap untuk update status" : "Klik tahap untuk melihat detail"}
              </p>
            </div>
            {/* Progress indicator */}
            <div className="text-right">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-sm font-semibold text-gray-900">
                {booking.checklists.filter((c) => c.status === "SELESAI").length} / {booking.checklists.length}
              </p>
            </div>
          </div>

          {booking.checklists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">Checklist belum tersedia</p>
              {canEditChecklist && (
                <p className="text-xs text-gray-400 mt-1">Checklist dibuat otomatis saat booking disetujui</p>
              )}
            </div>
          ) : (
            <div>
              {booking.checklists
                .sort((a, b) => a.tahap - b.tahap)
                .map((item, idx) => (
                  <StepperItem
                    key={item.id}
                    item={item}
                    index={idx}
                    total={booking.checklists.length}
                    canEdit={canEditChecklist}
                    bookingId={bookingId}
                    onUpdate={handleChecklistUpdate}
                  />
                ))}
            </div>
          )}

          {/* Keterangan otomasi */}
          {canEditChecklist && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              <p className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">Otomasi tahap 5:</span> Saat Akad Kredit diselesaikan, status unit berubah otomatis ke{" "}
                <span className="text-red-600 font-medium">Terjual</span>
              </p>
              <p className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">Otomasi tahap 6:</span> Saat Serah Terima diselesaikan, booking berubah ke{" "}
                <span className="text-teal-600 font-medium">Selesai</span> dan lead berubah ke{" "}
                <span className="text-green-600 font-medium">Closing</span>
              </p>
              <p className="text-xs text-gray-400">
                <span className="font-medium text-orange-600">Perlu Perhatian:</span> Tahap yang tidak berubah lebih dari{" "}
                <span className="font-semibold">{MACET_HARI} hari</span> akan ditandai otomatis
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Dokumen Booking — PRD 5.7                                         */}
      {/* ---------------------------------------------------------------- */}
      {["DISETUJUI", "SELESAI"].includes(booking.status) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-4">
          <DocumentUploader bookingId={bookingId} title="Dokumen Transaksi" />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Modal Batalkan Booking                                             */}
      {/* ---------------------------------------------------------------- */}
      {showBatalkanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Batalkan Booking</h2>
              <button onClick={() => { setShowBatalkanModal(false); setAlasanBatalkan(""); setError(null); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleBatalkan} className="px-5 py-4">
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Booking <strong>{booking?.lead?.nama}</strong> akan dibatalkan. Unit akan kembali ke status Tersedia.
              </p>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Alasan Pembatalan <span className="text-red-500">*</span>
              </label>
              <textarea rows={3} value={alasanBatalkan} onChange={(e) => setAlasanBatalkan(e.target.value)}
                placeholder="Jelaskan alasan pembatalan booking..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setShowBatalkanModal(false); setAlasanBatalkan(""); setError(null); }} disabled={approvePending}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Kembali
                </button>
                <button type="submit" disabled={approvePending || !alasanBatalkan.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                  {approvePending ? "Membatalkan..." : "Batalkan Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Modal Tolak                                                        */}
      {/* ---------------------------------------------------------------- */}
      {showTolakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Tolak Booking</h2>
              <button onClick={() => setShowTolakModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleTolak} className="px-5 py-4">
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Booking <strong>{booking.lead?.nama}</strong> akan ditolak.
              </p>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea rows={3} value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowTolakModal(false)} disabled={approvePending}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={approvePending || !alasanTolak.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                  {approvePending ? "Menolak..." : "Tolak Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    }>
      <BookingDetailContent />
    </Suspense>
  );
}
