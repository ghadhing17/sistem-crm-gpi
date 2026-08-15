"use client";

/**
 * Halaman Detail Lead — CRM Graha Padma
 * PRD 5.3 & 6.1 langkah 8-11:
 * - Info kontak + tombol telepon/WA
 * - Dropdown status pipeline
 * - Timeline aktivitas
 * - Modal Log Aktivitas
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import ActivityTimeline, { type Activity } from "@/components/leads/detail/ActivityTimeline";
import LogAktivitasModal from "@/components/leads/detail/LogAktivitasModal";
import EditLeadModal from "@/components/leads/detail/EditLeadModal";
import BuatBookingModal from "@/components/bookings/BuatBookingModal";
import DocumentUploader from "@/components/documents/DocumentUploader";
import { canEditLead, canUpdateLeadPipeline, canCreateBooking } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface LeadDetail {
  id: string;
  nama: string;
  noHp: string;
  email: string | null;
  sumber: string;
  statusPipeline: string;
  tagKualifikasi: string | null;
  minatTipe: string | null;
  alasanLost: string | null;
  catatanNegosiasi: string | null;
  isDuplikatDari: string | null;
  holdUnitId: string | null;
  holdUnit?: { id: string; blok: string; noKavling: string; tipe: string; harga: string; cluster: { namaCluster: string } } | null;
  createdAt: string;
  updatedAt: string;
  salesPic: { id: string; nama: string; role: string } | null;
  minatCluster: { id: string; namaCluster: string; lokasi: string } | null;
  _count: { activities: number; bookings: number; documents: number };
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  BARU:        { label: "Baru",        color: "text-blue-700",   bg: "bg-blue-100" },
  DIHUBUNGI:   { label: "Dihubungi",   color: "text-sky-700",    bg: "bg-sky-100" },
  KUALIFIKASI: { label: "Kualifikasi", color: "text-purple-700", bg: "bg-purple-100" },
  SITE_VISIT:  { label: "Site Visit",  color: "text-orange-700", bg: "bg-orange-100" },
  NEGOSIASI:   { label: "Negosiasi",   color: "text-amber-700",  bg: "bg-amber-100" },
  BOOKING:     { label: "Booking",     color: "text-teal-700",   bg: "bg-teal-100" },
  CLOSING:     { label: "Closing",     color: "text-green-700",  bg: "bg-green-100" },
  LOST:        { label: "Lost",        color: "text-red-700",    bg: "bg-red-100" },
};

const SUMBER_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp", TELEPON: "Telepon", WEBSITE: "Website",
  FACEBOOK_ADS: "Facebook Ads", GOOGLE_ADS: "Google Ads",
  PAMERAN: "Pameran", REFERRAL: "Referral", INSTAGRAM: "Instagram", LAINNYA: "Lainnya",
};

const KUALIFIKASI_META: Record<string, { label: string; color: string }> = {
  HOT:  { label: "🔴 Hot",  color: "text-red-700 bg-red-50 border-red-200" },
  WARM: { label: "🟡 Warm", color: "text-amber-700 bg-amber-50 border-amber-200" },
  COLD: { label: "🔵 Cold", color: "text-blue-700 bg-blue-50 border-blue-200" },
};

const STATUS_ORDER = [
  "BARU","DIHUBUNGI","KUALIFIKASI","SITE_VISIT","NEGOSIASI","BOOKING","CLOSING","LOST",
];

// ---------------------------------------------------------------------------

function LeadDetailContent() {
  const params  = useParams();
  const router  = useRouter();
  const { data: session } = useSession();
  const leadId  = params.id as string;

  const role    = session?.user?.role as UserRole | undefined;
  const userId  = session?.user?.id ?? "";

  const [lead, setLead]             = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingLead, setLoadingLead]   = useState(true);
  const [loadingAct, setLoadingAct]     = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Hak akses
  const canEdit    = lead && role ? canEditLead({ id: userId, role }, { salesPicId: lead.salesPic?.id ?? null }) : false;
  const canStatus  = lead && role ? canUpdateLeadPipeline({ id: userId, role }, { salesPicId: lead.salesPic?.id ?? null }) : false;
  const canBooking = role ? canCreateBooking({ id: userId, role }) : false;
  const canDelete  = role === "MANAGER" || role === "SUPER_ADMIN";

  // ---------------------------------------------------------------------------
  // Fetch lead detail
  // ---------------------------------------------------------------------------
  const fetchLead = useCallback(async () => {
    setLoadingLead(true);
    try {
      const res  = await fetch(`/api/leads/${leadId}`);
      if (res.status === 404) { router.push("/leads"); return; }
      const json = await res.json();
      if (res.ok) setLead(json.data.lead);
    } finally {
      setLoadingLead(false);
    }
  }, [leadId, router]);

  // ---------------------------------------------------------------------------
  // Fetch aktivitas
  // ---------------------------------------------------------------------------
  const fetchActivities = useCallback(async () => {
    setLoadingAct(true);
    try {
      const res  = await fetch(`/api/activities?leadId=${leadId}`);
      const json = await res.json();
      if (res.ok) setActivities(json.data.activities);
    } finally {
      setLoadingAct(false);
    }
  }, [leadId]);

  useEffect(() => { fetchLead(); fetchActivities(); }, [fetchLead, fetchActivities]);

  // ---------------------------------------------------------------------------
  // Update status pipeline
  // ---------------------------------------------------------------------------
  async function handleStatusChange(newStatus: string) {
    if (!lead || newStatus === lead.statusPipeline) return;
    // Untuk LOST, arahkan ke pipeline kanban agar modal alasan muncul
    if (newStatus === "LOST") {
      const konfirmasi = window.confirm(
        "Untuk memindahkan ke Lost, harap isi alasan melalui halaman Pipeline Kanban atau ketik alasan di sini.\n\nLanjutkan tanpa alasan? (Tidak disarankan)"
      );
      if (!konfirmasi) return;
    }

    setStatusChanging(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusPipeline: newStatus }),
      });
      const json = await res.json();
      if (res.ok) {
        setLead((prev) => prev ? { ...prev, statusPipeline: newStatus } : prev);
      } else {
        setError(json.error ?? "Gagal mengubah status");
      }
    } finally {
      setStatusChanging(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Tambah aktivitas ke timeline (optimistis)
  // ---------------------------------------------------------------------------
  function handleAktivitasBaru(activity: Activity) {
    setActivities((prev) => [activity, ...prev]);
    setLead((prev) => prev ? { ...prev, _count: { ...prev._count, activities: prev._count.activities + 1 } } : prev);
    setShowModal(false);
  }

  // ---------------------------------------------------------------------------
  // Hapus lead
  // ---------------------------------------------------------------------------
  async function handleDeleteLead() {
    if (!lead) return;
    setDeleting(true);
    setError(null);
    try {
      const res  = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menghapus lead"); setShowDeleteConfirm(false); return; }
      router.push("/leads");
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: normalisasi nomor untuk wa.me / tel:
  // ---------------------------------------------------------------------------
  function noHpInternasional(hp: string): string {
    let n = hp.replace(/\D/g, "");
    if (n.startsWith("0")) n = "62" + n.slice(1);
    return n;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadingLead) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-2 text-sm text-gray-500">Memuat detail lead...</span>
      </div>
    );
  }

  if (!lead) return null;

  const statusMeta   = STATUS_META[lead.statusPipeline];
  const tanggalMasuk = format(new Date(lead.createdAt), "d MMMM yyyy", { locale: localeId });
  const hpIntl       = noHpInternasional(lead.noHp);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
        <Link href="/leads" className="hover:text-[#009182] transition-colors">Leads</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{lead.nama}</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BAGIAN ATAS — Info kontak                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Avatar + nama */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-teal-700">
                {lead.nama.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{lead.nama}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta?.bg} ${statusMeta?.color}`}>
                  {statusMeta?.label ?? lead.statusPipeline}
                </span>
                {lead.tagKualifikasi && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${KUALIFIKASI_META[lead.tagKualifikasi]?.color}`}>
                    {KUALIFIKASI_META[lead.tagKualifikasi]?.label}
                  </span>
                )}
                {lead.isDuplikatDari && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Duplikat
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tombol aksi cepat */}
          <div className="flex items-center gap-2 flex-wrap">
            {canBooking && lead && !["LOST","CLOSING","BOOKING"].includes(lead.statusPipeline) && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#009182] text-[#009182] hover:bg-teal-50 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Buat Booking
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Log Aktivitas
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Grid info kontak */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* No HP dengan tombol telepon & WA */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">No HP / WA</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-medium text-gray-900 font-mono">{lead.noHp}</span>
                {/* Tombol klik-untuk-telepon */}
                <a
                  href={`tel:${lead.noHp}`}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Telepon"
                  aria-label={`Telepon ${lead.noHp}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </a>
                {/* Tombol klik-untuk-WA */}
                <a
                  href={`https://wa.me/${hpIntl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                  title="WhatsApp"
                  aria-label={`Chat WhatsApp ${lead.noHp}`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.548 4.085 1.505 5.8L.057 23.569l5.921-1.556A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.659-.52-5.169-1.422l-.371-.22-3.515.923.938-3.426-.242-.394A9.966 9.966 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Email */}
          {lead.email && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <a href={`mailto:${lead.email}`} className="text-sm font-medium text-[#009182] hover:underline">{lead.email}</a>
              </div>
            </div>
          )}

          {/* Sumber */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sumber Lead</p>
              <p className="text-sm font-medium text-gray-900">{SUMBER_LABELS[lead.sumber] ?? lead.sumber}</p>
            </div>
          </div>

          {/* Tanggal masuk */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tanggal Masuk</p>
              <p className="text-sm font-medium text-gray-900">{tanggalMasuk}</p>
            </div>
          </div>

          {/* Minat */}
          {(lead.minatCluster || lead.minatTipe) && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Minat Properti</p>
                <p className="text-sm font-medium text-gray-900">
                  {[lead.minatCluster?.namaCluster, lead.minatTipe].filter(Boolean).join(" — ")}
                </p>
              </div>
            </div>
          )}

          {/* Sales PIC */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sales PIC</p>
              <p className="text-sm font-medium text-gray-900">
                {lead.salesPic?.nama ?? (
                  <span className="text-amber-600">Belum di-assign</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BAGIAN TENGAH — Dropdown status + aksi                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label htmlFor="status-select" className="text-xs font-medium text-gray-600 whitespace-nowrap">
            Status Pipeline:
          </label>
          <select
            id="status-select"
            value={lead.statusPipeline}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={!canStatus || statusChanging}
            className={`flex-1 px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50 disabled:cursor-not-allowed ${
              statusMeta
                ? `${statusMeta.bg} ${statusMeta.color} border-transparent`
                : "border-gray-300 text-gray-700 bg-white"
            }`}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
          {statusChanging && (
            <svg className="w-4 h-4 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        {/* Counter aktivitas */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{lead._count.activities} aktivitas</span>
          <span>·</span>
          <span>{lead._count.bookings} booking</span>
          <span>·</span>
          <span>{lead._count.documents} dokumen</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BAGIAN BAWAH — Timeline aktivitas                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Timeline Aktivitas</h2>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#009182] text-xs font-medium text-[#009182] hover:bg-teal-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Aktivitas
            </button>
          )}
        </div>

        <ActivityTimeline activities={activities} loading={loadingAct} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BAGIAN DOKUMEN                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <DocumentUploader leadId={lead.id} title="Dokumen Lead" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal Log Aktivitas                                                  */}
      {/* ------------------------------------------------------------------ */}
      {showModal && (
        <LogAktivitasModal
          leadId={lead.id}
          leadNama={lead.nama}
          noHp={lead.noHp}
          onSimpan={handleAktivitasBaru}
          onTutup={() => setShowModal(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal Buat Booking (PRD 5.5 & 6.2 langkah 5)                        */}
      {/* ------------------------------------------------------------------ */}
      {showBookingModal && lead && (
        <BuatBookingModal
          leadId={lead.id}
          leadNama={lead.nama}
          holdUnit={lead.holdUnit ?? undefined}
          onBerhasil={(booking) => {
            setShowBookingModal(false);
            if (booking.butuhApproval) {
              setError(null);
            }
            fetchLead();
          }}
          onTutup={() => setShowBookingModal(false)}
        />
      )}

      {/* Modal Edit Lead */}
      {showEditModal && lead && (
        <EditLeadModal
          leadId={lead.id}
          initial={{
            nama:             lead.nama,
            noHp:             lead.noHp,
            email:            lead.email,
            sumber:           lead.sumber,
            minatClusterId:   lead.minatCluster?.id ?? null,
            minatTipe:        lead.minatTipe,
            tagKualifikasi:   lead.tagKualifikasi,
            catatanNegosiasi: lead.catatanNegosiasi,
          }}
          onSimpan={(updated) => {
            setLead((prev) => prev ? {
              ...prev,
              nama:             updated.nama,
              noHp:             updated.noHp,
              email:            updated.email,
              sumber:           updated.sumber,
              minatTipe:        updated.minatTipe,
              tagKualifikasi:   updated.tagKualifikasi,
              catatanNegosiasi: updated.catatanNegosiasi,
            } : prev);
            setShowEditModal(false);
          }}
          onTutup={() => setShowEditModal(false)}
        />
      )}

      {/* Konfirmasi Hapus Lead */}
      {showDeleteConfirm && lead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Hapus Lead</h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hapus lead <strong>{lead.nama}</strong> beserta semua aktivitas dan dokumen terkait? Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            {error && <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setError(null); }} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDeleteLead} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menghapus...</>
                ) : "Hapus Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export dengan Suspense
// ---------------------------------------------------------------------------
export default function LeadDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <LeadDetailContent />
    </Suspense>
  );
}
