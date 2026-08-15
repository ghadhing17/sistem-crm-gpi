"use client";

/**
 * Halaman /units — Daftar Cluster
 * PRD 5.4: daftar cluster + stats unit per status + CRUD cluster (Admin BO)
 */

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface ClusterStats {
  TERSEDIA: number; NEGOSIASI: number; BOOKED: number;
  TERJUAL: number; TIDAK_DIJUAL: number; total: number;
}
interface ClusterItem {
  id: string; namaCluster: string; lokasi: string;
  deskripsi: string | null; createdAt: string; stats: ClusterStats;
}

// ---------------------------------------------------------------------------
// Warna status
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  TERSEDIA:     { dot: "bg-green-500",  label: "Tersedia",      text: "text-green-700"  },
  NEGOSIASI:    { dot: "bg-yellow-500", label: "Negosiasi",     text: "text-yellow-700" },
  BOOKED:       { dot: "bg-orange-500", label: "Booked",        text: "text-orange-700" },
  TERJUAL:      { dot: "bg-red-500",    label: "Terjual",       text: "text-red-700"    },
  TIDAK_DIJUAL: { dot: "bg-gray-400",   label: "Tidak Dijual",  text: "text-gray-500"   },
};

// ---------------------------------------------------------------------------
// Modal Form Cluster
// ---------------------------------------------------------------------------

interface ClusterFormData { namaCluster: string; lokasi: string; deskripsi: string; }
const FORM_INIT: ClusterFormData = { namaCluster: "", lokasi: "", deskripsi: "" };

interface ClusterModalProps {
  mode: "create" | "edit";
  initial?: ClusterFormData & { id: string };
  onSave: (cluster: ClusterItem) => void;
  onTutup: () => void;
}

function ClusterModal({ mode, initial, onSave, onTutup }: ClusterModalProps) {
  const [form, setForm] = useState<ClusterFormData>(
    initial ? { namaCluster: initial.namaCluster, lokasi: initial.lokasi, deskripsi: initial.deskripsi ?? "" }
            : FORM_INIT
  );
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof ClusterFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.namaCluster.trim()) { setError("Nama cluster wajib diisi"); return; }
    if (!form.lokasi.trim())      { setError("Lokasi wajib diisi"); return; }

    startTransition(async () => {
      const url    = mode === "create" ? "/api/clusters" : `/api/clusters/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, deskripsi: form.deskripsi || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menyimpan cluster"); return; }
      onSave(json.data.cluster);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {mode === "create" ? "Tambah Cluster Baru" : "Edit Cluster"}
          </h2>
          <button onClick={onTutup} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Tutup">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="cl-nama" className="block text-xs font-medium text-gray-700 mb-1.5">Nama Cluster <span className="text-red-500">*</span></label>
            <input id="cl-nama" type="text" value={form.namaCluster} onChange={(e) => setField("namaCluster", e.target.value)} placeholder="Graha Padma Residence" disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="cl-lokasi" className="block text-xs font-medium text-gray-700 mb-1.5">Lokasi <span className="text-red-500">*</span></label>
            <input id="cl-lokasi" type="text" value={form.lokasi} onChange={(e) => setField("lokasi", e.target.value)} placeholder="Jl. Raya Padma No.1, Denpasar" disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="cl-desk" className="block text-xs font-medium text-gray-700 mb-1.5">Deskripsi <span className="text-xs text-gray-400 font-normal">(opsional)</span></label>
            <textarea id="cl-desk" rows={3} value={form.deskripsi} onChange={(e) => setField("deskripsi", e.target.value)} placeholder="Deskripsi singkat cluster..." disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 resize-none" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onTutup} disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
              {isPending ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menyimpan...</> : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Halaman utama
// ---------------------------------------------------------------------------

function UnitsContent() {
  const { data: session } = useSession();
  const role   = session?.user?.role as UserRole | undefined;
  const canEdit = role ? canManageInventory({ id: session!.user.id, role }) : false;

  const [clusters, setClusters]   = useState<ClusterItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<(ClusterFormData & { id: string }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClusterItem | null>(null);
  const [deleting, startDelete]   = useTransition();
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clusters")
      .then((r) => r.json())
      .then((res) => { if (res.data) setClusters(res.data.clusters); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaveCluster(cluster: ClusterItem) {
    setClusters((prev) => {
      const idx = prev.findIndex((c) => c.id === cluster.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...cluster };
        return updated;
      }
      return [...prev, { ...cluster, stats: { TERSEDIA: 0, NEGOSIASI: 0, BOOKED: 0, TERJUAL: 0, TIDAK_DIJUAL: 0, total: 0 } }];
    });
    setShowModal(false);
    setEditTarget(null);
  }

  function handleDelete(cluster: ClusterItem) {
    setError(null);
    startDelete(async () => {
      const res  = await fetch(`/api/clusters/${cluster.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menghapus cluster"); setDeleteConfirm(null); return; }
      setClusters((prev) => prev.filter((c) => c.id !== cluster.id));
      setDeleteConfirm(null);
    });
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Unit & Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Memuat..." : `${clusters.length} cluster`}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Tambah Cluster
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">{error}
          <button className="ml-2 underline text-xs" onClick={() => setError(null)}>Tutup</button>
        </div>
      )}

      {/* Legend status */}
      <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${val.dot}`} />
            <span className="text-xs text-gray-500">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Grid cluster */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-52 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : clusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-[#009182]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Belum ada cluster</p>
          {canEdit && <p className="text-xs text-gray-500 mt-1">Klik "Tambah Cluster" untuk memulai</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
              {/* Header kartu */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Link href={`/units/${cluster.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#009182] transition-colors leading-tight line-clamp-1">
                    {cluster.namaCluster}
                  </Link>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => setEditTarget({ id: cluster.id, namaCluster: cluster.namaCluster, lokasi: cluster.lokasi, deskripsi: cluster.deskripsi ?? "" })}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-[#009182] hover:bg-teal-50 transition-colors" aria-label="Edit cluster">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cluster)}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Hapus cluster">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{cluster.lokasi}</p>
                <p className="text-xs font-semibold text-gray-700 mt-2">{cluster.stats.total} unit total</p>
              </div>

              {/* Mini bar stats */}
              {cluster.stats.total > 0 && (
                <div className="px-5 pb-3">
                  <div className="flex h-2 rounded-full overflow-hidden gap-px">
                    {Object.entries(STATUS_COLORS).map(([key, val]) => {
                      const count = cluster.stats[key as keyof ClusterStats] as number;
                      if (count === 0) return null;
                      const pct = (count / cluster.stats.total) * 100;
                      return (
                        <div key={key} className={`${val.dot} h-full`} style={{ width: `${pct}%` }}
                          title={`${val.label}: ${count}`} />
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 mt-2">
                    {Object.entries(STATUS_COLORS).map(([key, val]) => {
                      const count = cluster.stats[key as keyof ClusterStats] as number;
                      if (count === 0) return null;
                      return (
                        <div key={key} className="flex items-center justify-between py-0.5">
                          <span className={`text-xs ${val.text}`}>{val.label}</span>
                          <span className="text-xs font-medium text-gray-700">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Link ke daftar unit */}
              <div className="px-5 pb-4">
                <Link href={`/units/${cluster.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#009182] hover:text-[#009182] hover:bg-teal-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  Lihat Daftar Unit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal tambah/edit cluster */}
      {(showModal || editTarget) && (
        <ClusterModal
          mode={editTarget ? "edit" : "create"}
          initial={editTarget ?? undefined}
          onSave={handleSaveCluster}
          onTutup={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {/* Konfirmasi hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Hapus Cluster</h2>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Hapus cluster <strong>{deleteConfirm.namaCluster}</strong>? Cluster yang masih punya unit tidak bisa dihapus.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnitsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    }>
      <UnitsContent />
    </Suspense>
  );
}
