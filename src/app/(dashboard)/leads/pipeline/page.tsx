"use client";

/**
 * Halaman Pipeline Kanban — CRM Graha Padma
 * PRD 5.2: drag-and-drop per kolom status, RBAC, SLA badge, modal konfirmasi
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn, { COLUMN_META } from "@/components/leads/kanban/KanbanColumn";
import PindahStatusModal from "@/components/leads/kanban/PindahStatusModal";
import { type KanbanLead } from "@/components/leads/kanban/KanbanCard";
import { canViewAllLeads, canUpdateLeadPipeline } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// Urutan kolom sesuai PRD 5.2
const KOLOM_ORDER = [
  "BARU",
  "DIHUBUNGI",
  "KUALIFIKASI",
  "SITE_VISIT",
  "NEGOSIASI",
  "BOOKING",
  "CLOSING",
  "LOST",
] as const;

type KanbanBoard = Record<string, KanbanLead[]>;

interface PendingDrop {
  lead: KanbanLead;
  statusDari: string;
  statusKe: string;
  sourceIndex: number;
  destIndex: number;
}

const SUMBER_OPTIONS = [
  { value: "WHATSAPP",     label: "WhatsApp" },
  { value: "TELEPON",      label: "Telepon" },
  { value: "WEBSITE",      label: "Website" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "GOOGLE_ADS",   label: "Google Ads" },
  { value: "PAMERAN",      label: "Pameran" },
  { value: "REFERRAL",     label: "Referral" },
  { value: "INSTAGRAM",    label: "Instagram" },
  { value: "LAINNYA",      label: "Lainnya" },
];

// ---------------------------------------------------------------------------

function PipelineContent() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const userId = session?.user?.id ?? "";

  const canSeeAll = role ? canViewAllLeads({ id: userId, role }) : false;

  const [board, setBoard] = useState<KanbanBoard>(() =>
    Object.fromEntries(KOLOM_ORDER.map((k) => [k, []]))
  );
  const [loading, setLoading] = useState(true);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [savingDrop, setSavingDrop] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [filterSumber, setFilterSumber]   = useState("");
  const [filterCluster, setFilterCluster] = useState("");
  const [filterSales, setFilterSales]     = useState("");
  const [clusters, setClusters]   = useState<{ id: string; namaCluster: string }[]>([]);
  const [salesList, setSalesList] = useState<{ id: string; nama: string }[]>([]);

  // Load data dropdown
  useEffect(() => {
    fetch("/api/clusters").then(r => r.json()).then(res => setClusters(res.data?.clusters ?? [])).catch(() => {});
    if (canSeeAll) {
      fetch("/api/users/sales").then(r => r.json()).then(res => setSalesList(res.data?.users ?? [])).catch(() => {});
    }
  }, [canSeeAll]);

  // ---------------------------------------------------------------------------
  // Fetch semua lead dan susun ke board
  // ---------------------------------------------------------------------------
  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" }); // Kanban load lebih banyak
      if (filterSumber)  params.set("sumber", filterSumber);
      if (filterCluster) params.set("minatClusterId", filterCluster);
      if (filterSales)   params.set("salesPicId", filterSales);

      const res  = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      if (!res.ok) return;

      const leads: KanbanLead[] = json.data.leads;

      // Susun ke board per status
      const newBoard: KanbanBoard = Object.fromEntries(KOLOM_ORDER.map((k) => [k, []]));
      for (const lead of leads) {
        const col = lead.statusPipeline as typeof KOLOM_ORDER[number];
        if (newBoard[col]) newBoard[col].push(lead);
      }
      setBoard(newBoard);
    } finally {
      setLoading(false);
    }
  }, [filterSumber, filterCluster, filterSales]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // ---------------------------------------------------------------------------
  // Drag end handler
  // ---------------------------------------------------------------------------
  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const statusDari = source.droppableId;
    const statusKe   = destination.droppableId;

    // Cari lead yang di-drag
    const lead = board[statusDari]?.[source.index];
    if (!lead) return;

    // Cek izin RBAC: Sales Exec hanya bisa drag lead miliknya
    if (!role) return;
    const canDrag = canUpdateLeadPipeline({ id: userId, role }, { salesPicId: lead.salesPicId });
    if (!canDrag) {
      setErrorMsg("Anda hanya bisa memindahkan lead milik Anda sendiri.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (statusDari === statusKe) {
      // Reorder dalam kolom yang sama — tidak perlu modal
      setBoard((prev) => {
        const col = [...(prev[statusDari] ?? [])];
        const [moved] = col.splice(source.index, 1);
        col.splice(destination.index, 0, moved);
        return { ...prev, [statusDari]: col };
      });
      return;
    }

    // Pindah ke kolom berbeda — tampilkan modal konfirmasi
    setPendingDrop({
      lead,
      statusDari,
      statusKe,
      sourceIndex: source.index,
      destIndex: destination.index,
    });
  }

  // ---------------------------------------------------------------------------
  // Konfirmasi pindah status (dari modal)
  // ---------------------------------------------------------------------------
  async function handleKonfirmasiPindah(catatan: string) {
    if (!pendingDrop) return;
    const { lead, statusDari, statusKe, destIndex } = pendingDrop;
    setSavingDrop(true);

    try {
      const body: Record<string, unknown> = { statusPipeline: statusKe };
      if (catatan) body.catatanNegosiasi = catatan;
      if (statusKe === "LOST") body.alasanLost = catatan;

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error ?? "Gagal memperbarui status lead.");
        setPendingDrop(null);
        return;
      }

      // Update board secara optimistis
      setBoard((prev) => {
        const srcCol  = [...(prev[statusDari] ?? [])];
        const destCol = [...(prev[statusKe] ?? [])];
        const [moved] = srcCol.splice(pendingDrop.sourceIndex, 1);
        destCol.splice(destIndex, 0, { ...moved, statusPipeline: statusKe });
        return { ...prev, [statusDari]: srcCol, [statusKe]: destCol };
      });
    } finally {
      setSavingDrop(false);
      setPendingDrop(null);
    }
  }

  const totalLeads = Object.values(board).reduce((sum, col) => sum + col.length, 0);
  const hasFilter  = !!(filterSumber || filterCluster || filterSales);

  return (
    <div className="flex flex-col h-[calc(100vh-56px-48px)] min-h-0">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pipeline Lead</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Memuat..." : `${totalLeads} lead${hasFilter ? " (difilter)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            Tabel
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
        <select
          value={filterSumber}
          onChange={(e) => setFilterSumber(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
          aria-label="Filter sumber"
        >
          <option value="">Semua sumber</option>
          {SUMBER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterCluster}
          onChange={(e) => setFilterCluster(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
          aria-label="Filter cluster"
        >
          <option value="">Semua cluster</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>{c.namaCluster}</option>
          ))}
        </select>

        {canSeeAll && (
          <select
            value={filterSales}
            onChange={(e) => setFilterSales(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
            aria-label="Filter sales"
          >
            <option value="">Semua sales</option>
            {salesList.map((s) => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        )}

        {hasFilter && (
          <button
            onClick={() => { setFilterSumber(""); setFilterCluster(""); setFilterSales(""); }}
            className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Reset filter
          </button>
        )}

        {/* Legenda SLA */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
            ⚠ Xh
          </span>
          = hari tanpa aktivitas (merah ≥3 hari)
        </div>
      </div>

      {/* Error toast */}
      {errorMsg && (
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 flex-shrink-0" role="alert">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Kanban board — horizontal scroll                                    */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Memuat pipeline...</span>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
            {KOLOM_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={board[status] ?? []}
                currentUserId={userId}
                // Manager/Super Admin bisa drag semua; Sales Exec hanya miliknya
                canDragAll={
                  role === "MANAGER" ||
                  role === "SUPER_ADMIN" ||
                  role === "ADMIN"
                }
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal konfirmasi pindah status                                       */}
      {/* ------------------------------------------------------------------ */}
      {pendingDrop && (
        <PindahStatusModal
          leadNama={pendingDrop.lead.nama}
          statusDari={pendingDrop.statusDari}
          statusKe={pendingDrop.statusKe}
          onKonfirmasi={handleKonfirmasiPindah}
          onBatal={() => setPendingDrop(null)}
          isLoading={savingDrop}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export dengan Suspense
// ---------------------------------------------------------------------------
export default function LeadsPipelinePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <PipelineContent />
    </Suspense>
  );
}
