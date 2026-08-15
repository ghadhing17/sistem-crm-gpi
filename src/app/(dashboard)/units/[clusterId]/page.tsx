"use client";

/**
 * Halaman /units/[clusterId] — Peta Blok Unit
 * PRD 5.4: grid kavling berwarna status + CRUD unit (Admin BO)
 */

import { useState, useEffect, useTransition, Suspense } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Tipe & Konstanta
// ---------------------------------------------------------------------------

interface Unit {
  id: string; blok: string; noKavling: string; tipe: string;
  luasTanah: number; luasBangunan: number; harga: string;
  status: string; deskripsi: string | null;
}
interface ClusterDetail {
  id: string; namaCluster: string; lokasi: string; deskripsi: string | null;
  units: Unit[];
}

const STATUS_META: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  TERSEDIA:     { label: "Tersedia",      bg: "bg-green-50",  border: "border-green-300",  text: "text-green-800",  dot: "bg-green-500" },
  NEGOSIASI:    { label: "Negosiasi",     bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", dot: "bg-yellow-500" },
  BOOKED:       { label: "Booked",        bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-500" },
  TERJUAL:      { label: "Terjual",       bg: "bg-red-50",    border: "border-red-300",    text: "text-red-800",    dot: "bg-red-500" },
  TIDAK_DIJUAL: { label: "Tidak Dijual",  bg: "bg-gray-100",  border: "border-gray-300",   text: "text-gray-500",   dot: "bg-gray-400" },
};

const STATUS_OPTIONS = ["TERSEDIA","NEGOSIASI","BOOKED","TERJUAL","TIDAK_DIJUAL"] as const;

function formatRupiah(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : val;
  if (isNaN(n)) return "-";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".0","") } M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Modal Form Unit
// ---------------------------------------------------------------------------

interface UnitFormData {
  clusterId: string; blok: string; noKavling: string; tipe: string;
  luasTanah: string; luasBangunan: string; harga: string;
  status: string; deskripsi: string;
}

interface UnitModalProps {
  clusterId: string;
  mode: "create" | "edit";
  initial?: Unit;
  onSave: (unit: Unit) => void;
  onTutup: () => void;
}

function UnitModal({ clusterId, mode, initial, onSave, onTutup }: UnitModalProps) {
  const [form, setForm] = useState<UnitFormData>({
    clusterId,
    blok:         initial?.blok         ?? "",
    noKavling:    initial?.noKavling     ?? "",
    tipe:         initial?.tipe          ?? "",
    luasTanah:    String(initial?.luasTanah   ?? ""),
    luasBangunan: String(initial?.luasBangunan ?? ""),
    harga:        initial?.harga         ?? "",
    status:       initial?.status        ?? "TERSEDIA",
    deskripsi:    initial?.deskripsi     ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof UnitFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.blok.trim())     { setError("Blok wajib diisi"); return; }
    if (!form.noKavling.trim()){ setError("Nomor kavling wajib diisi"); return; }
    if (!form.tipe.trim())     { setError("Tipe unit wajib diisi"); return; }
    if (!form.luasTanah || isNaN(Number(form.luasTanah)) || Number(form.luasTanah) <= 0) {
      setError("Luas tanah harus angka positif"); return;
    }
    if (!form.luasBangunan || isNaN(Number(form.luasBangunan)) || Number(form.luasBangunan) <= 0) {
      setError("Luas bangunan harus angka positif"); return;
    }
    if (!form.harga || isNaN(Number(form.harga)) || Number(form.harga) <= 0) {
      setError("Harga harus angka positif"); return;
    }

    startTransition(async () => {
      const url    = mode === "create" ? "/api/units" : `/api/units/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId:    form.clusterId,
          blok:         form.blok.toUpperCase(),
          noKavling:    form.noKavling,
          tipe:         form.tipe,
          luasTanah:    Number(form.luasTanah),
          luasBangunan: Number(form.luasBangunan),
          harga:        Number(form.harga),
          status:       form.status,
          deskripsi:    form.deskripsi || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menyimpan unit"); return; }
      onSave(json.data.unit);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {mode === "create" ? "Tambah Unit Baru" : `Edit Unit Blok ${initial?.blok}-${initial?.noKavling}`}
          </h2>
          <button onClick={onTutup} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <form onSubmit={handleSubmit} className="space-y-3" id="unit-form">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Blok <span className="text-red-500">*</span></label>
                <input type="text" value={form.blok} onChange={(e) => setField("blok", e.target.value)} placeholder="A" disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">No. Kavling <span className="text-red-500">*</span></label>
                <input type="text" value={form.noKavling} onChange={(e) => setField("noKavling", e.target.value)} placeholder="01" disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Unit <span className="text-red-500">*</span></label>
              <input type="text" value={form.tipe} onChange={(e) => setField("tipe", e.target.value)} placeholder="36/72, 45/90, 60/120" disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Luas Tanah (m²) <span className="text-red-500">*</span></label>
                <input type="number" min={1} step={0.5} value={form.luasTanah} onChange={(e) => setField("luasTanah", e.target.value)} placeholder="72" disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Luas Bangunan (m²) <span className="text-red-500">*</span></label>
                <input type="number" min={1} step={0.5} value={form.luasBangunan} onChange={(e) => setField("luasBangunan", e.target.value)} placeholder="36" disabled={isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Harga (Rp) <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.harga} onChange={(e) => setField("harga", e.target.value)} placeholder="450000000" disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              {form.harga && !isNaN(Number(form.harga)) && Number(form.harga) > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{formatRupiah(form.harga)}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi <span className="text-xs text-gray-400 font-normal">(opsional)</span></label>
              <textarea rows={2} value={form.deskripsi} onChange={(e) => setField("deskripsi", e.target.value)} placeholder="Menghadap timur, dekat taman, unit hook, dll." disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50 resize-none" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button type="button" onClick={onTutup} disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Batal</button>
          <button type="submit" form="unit-form" disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
            {isPending ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menyimpan...</> : "Simpan Unit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Halaman utama
// ---------------------------------------------------------------------------

function ClusterDetailContent() {
  const params  = useParams();
  const clusterId = params.clusterId as string;
  const { data: session } = useSession();
  const role    = session?.user?.role as UserRole | undefined;
  const canEdit = role ? canManageInventory({ id: session!.user.id, role }) : false;

  const [cluster, setCluster]     = useState<ClusterDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Unit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Unit | null>(null);
  const [deleting, startDelete]   = useTransition();
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setCluster(res.data.cluster); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clusterId]);

  function handleSaveUnit(unit: Unit) {
    setCluster((prev) => {
      if (!prev) return prev;
      const idx = prev.units.findIndex((u) => u.id === unit.id);
      if (idx >= 0) {
        const updated = [...prev.units];
        updated[idx] = unit;
        return { ...prev, units: updated };
      }
      return { ...prev, units: [...prev.units, unit].sort((a, b) => a.blok.localeCompare(b.blok) || a.noKavling.localeCompare(b.noKavling)) };
    });
    setShowModal(false);
    setEditTarget(null);
  }

  function handleDeleteUnit(unit: Unit) {
    setError(null);
    startDelete(async () => {
      const res  = await fetch(`/api/units/${unit.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menghapus unit"); setDeleteConfirm(null); return; }
      setCluster((prev) => prev ? { ...prev, units: prev.units.filter((u) => u.id !== unit.id) } : prev);
      setDeleteConfirm(null);
    });
  }

  const filteredUnits = (cluster?.units ?? []).filter((u) => !filterStatus || u.status === filterStatus);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
        <Link href="/units" className="hover:text-[#009182] transition-colors">Unit & Inventory</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{cluster?.namaCluster ?? "Memuat..."}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{cluster?.namaCluster ?? "..."}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cluster?.lokasi}</p>
        </div>
        {canEdit && cluster && (
          <button onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Tambah Unit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {error} <button className="ml-2 underline text-xs" onClick={() => setError(null)}>Tutup</button>
        </div>
      )}

      {/* Legend + filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs font-medium text-gray-600">Filter:</span>
        <button onClick={() => setFilterStatus("")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterStatus ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Semua ({cluster?.units.length ?? 0})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = (cluster?.units ?? []).filter((u) => u.status === s).length;
          if (count === 0) return null;
          const meta = STATUS_META[s];
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                filterStatus === s
                  ? `${meta.bg} ${meta.border} ${meta.text}`
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tabel daftar unit */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="ml-2 text-sm text-gray-500">Memuat unit...</span>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-700">
              {filterStatus ? `Tidak ada unit dengan status "${STATUS_META[filterStatus]?.label}"` : "Belum ada unit di cluster ini"}
            </p>
            {canEdit && !filterStatus && <p className="text-xs text-gray-500 mt-1">Klik "Tambah Unit" untuk menambahkan unit pertama</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Blok / Kavling</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Tipe</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Luas Tanah</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Luas Bangunan</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Harga</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUnits.map((unit) => {
                  const meta = STATUS_META[unit.status];
                  return (
                    <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/units/${clusterId}/${unit.id}`}
                          className="font-semibold text-gray-900 hover:text-[#009182] transition-colors">
                          Blok {unit.blok}-{unit.noKavling}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{unit.tipe}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{unit.luasTanah} m²</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{unit.luasBangunan} m²</td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatRupiah(unit.harga)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/units/${clusterId}/${unit.id}`}
                            className="text-xs text-[#009182] hover:text-[#007a6e] font-medium whitespace-nowrap">
                            Detail →
                          </Link>
                          {canEdit && (
                            <>
                              <span className="text-gray-300 mx-1">|</span>
                              <button onClick={() => setEditTarget(unit)}
                                className="text-xs text-gray-500 hover:text-[#009182]" aria-label="Edit unit">
                                Edit
                              </button>
                              <button onClick={() => setDeleteConfirm(unit)}
                                className="ml-1 text-xs text-gray-500 hover:text-red-600" aria-label="Hapus unit">
                                Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal unit */}
      {(showModal || editTarget) && cluster && (
        <UnitModal
          clusterId={clusterId}
          mode={editTarget ? "edit" : "create"}
          initial={editTarget ?? undefined}
          onSave={handleSaveUnit}
          onTutup={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {/* Konfirmasi hapus unit */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Hapus Unit</h2>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Hapus unit <strong>Blok {deleteConfirm.blok}-{deleteConfirm.noKavling}</strong> ({deleteConfirm.tipe})?
              Unit dengan booking aktif tidak bisa dihapus.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Batal</button>
              <button onClick={() => handleDeleteUnit(deleteConfirm)} disabled={deleting}
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

export default function ClusterDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    }>
      <ClusterDetailContent />
    </Suspense>
  );
}
