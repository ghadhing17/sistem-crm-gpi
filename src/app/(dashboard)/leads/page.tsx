"use client";

/**
 * Halaman Daftar Lead — CRM Graha Padma
 * PRD Bab 7 poin 4: tabel dengan kolom nama, no HP, sumber, status, sales PIC,
 * terakhir dihubungi + filter per sales, cluster, sumber, rentang tanggal.
 *
 * Otorisasi (PRD 3.1):
 * - Sales Executive: hanya lead miliknya → filter sales disembunyikan
 * - Manager, Admin BO, Management, Super Admin: semua lead + filter per sales
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import TambahLeadForm from "@/components/leads/TambahLeadForm";
import { canViewAllLeads, canCreateLead } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface Lead {
  id: string;
  nama: string;
  noHp: string;
  email: string | null;
  sumber: string;
  statusPipeline: string;
  tagKualifikasi: string | null;
  minatTipe: string | null;
  createdAt: string;
  updatedAt: string;
  salesPic: { id: string; nama: string } | null;
  minatCluster: { id: string; namaCluster: string } | null;
  _count: { activities: number };
  activities: { createdAt: string; jenis: string }[];
}

interface SalesUser {
  id: string;
  nama: string;
  role: string;
}

interface Cluster {
  id: string;
  namaCluster: string;
}

interface Filters {
  search: string;
  status: string;
  sumber: string;
  salesPicId: string;
  minatClusterId: string;
  dateFrom: string;
  dateTo: string;
}

const FILTERS_INITIAL: Filters = {
  search: "",
  status: "",
  sumber: "",
  salesPicId: "",
  minatClusterId: "",
  dateFrom: "",
  dateTo: "",
};

// ---------------------------------------------------------------------------
// Label konstanta
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { label: string; color: string }> = {
  BARU:       { label: "Baru",       color: "bg-blue-100 text-blue-700" },
  DIHUBUNGI:  { label: "Dihubungi",  color: "bg-sky-100 text-sky-700" },
  KUALIFIKASI:{ label: "Kualifikasi",color: "bg-purple-100 text-purple-700" },
  SITE_VISIT: { label: "Site Visit", color: "bg-orange-100 text-orange-700" },
  NEGOSIASI:  { label: "Negosiasi",  color: "bg-amber-100 text-amber-700" },
  BOOKING:    { label: "Booking",    color: "bg-teal-100 text-teal-700" },
  CLOSING:    { label: "Closing",    color: "bg-green-100 text-green-700" },
  LOST:       { label: "Lost",       color: "bg-red-100 text-red-700" },
};

const SUMBER_OPTIONS = [
  { value: "WHATSAPP",    label: "WhatsApp" },
  { value: "TELEPON",     label: "Telepon" },
  { value: "WEBSITE",     label: "Website" },
  { value: "FACEBOOK_ADS",label: "Facebook Ads" },
  { value: "GOOGLE_ADS",  label: "Google Ads" },
  { value: "PAMERAN",     label: "Pameran" },
  { value: "REFERRAL",    label: "Referral" },
  { value: "INSTAGRAM",   label: "Instagram" },
  { value: "LAINNYA",     label: "Lainnya" },
];

const KUALIFIKASI_BADGE: Record<string, string> = {
  HOT: "🔴", WARM: "🟡", COLD: "🔵",
};

// ---------------------------------------------------------------------------
// Helper: label "terakhir dihubungi"
// ---------------------------------------------------------------------------

function labelTerakhirDihubungi(lead: Lead): { text: string; alert: boolean } {
  const lastActivity = lead.activities[0];
  if (!lastActivity) {
    // Belum ada aktivitas sama sekali — hitung dari createdAt
    const hari = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      text: hari === 0 ? "Baru masuk" : `${hari}h lalu (belum dihubungi)`,
      alert: hari >= 3,
    };
  }
  const hari = Math.floor(
    (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const text = formatDistanceToNow(new Date(lastActivity.createdAt), {
    addSuffix: true,
    locale: localeId,
  });
  return { text, alert: hari >= 3 };
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

function LeadsPageContent() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  const canSeeAll = role ? canViewAllLeads({ id: session!.user.id, role }) : false;
  const canAdd    = role ? canCreateLead({ id: session!.user.id, role }) : false;

  const [leads, setLeads]       = useState<Lead[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Filter state — committed (dipakai fetch) vs draft (diketik user)
  const [filters, setFilters]         = useState<Filters>(FILTERS_INITIAL);
  const [draftFilters, setDraftFilters] = useState<Filters>(FILTERS_INITIAL);
  const [filterOpen, setFilterOpen]   = useState(false);

  // Data dropdown
  const [salesList, setSalesList]     = useState<SalesUser[]>([]);
  const [clusterList, setClusterList] = useState<Cluster[]>([]);

  const LIMIT = 20;

  // Load dropdown data sekali saja
  useEffect(() => {
    fetch("/api/clusters")
      .then((r) => r.json())
      .then((res) => setClusterList(res.data?.clusters ?? []))
      .catch(() => {});

    if (canSeeAll) {
      fetch("/api/users/sales")
        .then((r) => r.json())
        .then((res) => setSalesList(res.data?.users ?? []))
        .catch(() => {});
    }
  }, [canSeeAll]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (filters.search)        params.set("search", filters.search);
      if (filters.status)        params.set("status", filters.status);
      if (filters.sumber)        params.set("sumber", filters.sumber);
      if (filters.salesPicId)    params.set("salesPicId", filters.salesPicId);
      if (filters.minatClusterId)params.set("minatClusterId", filters.minatClusterId);
      if (filters.dateFrom)      params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo)        params.set("dateTo", filters.dateTo);

      const res  = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      if (res.ok) {
        setLeads(json.data.leads);
        setTotal(json.data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function applyFilters() {
    setFilters({ ...draftFilters });
    setPage(1);
    setFilterOpen(false);
  }

  function resetFilters() {
    setFilters(FILTERS_INITIAL);
    setDraftFilters(FILTERS_INITIAL);
    setPage(1);
  }

  const hasActiveFilter = Object.values(filters).some((v) => v !== "");
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Daftar Lead</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Memuat..." : `${total} lead${hasActiveFilter ? " (difilter)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads/pipeline"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Pipeline
          </Link>
          {canAdd && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Lead
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Toolbar: search + filter                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, search: draftFilters.search })); setPage(1); }}
            className="flex gap-2 flex-1 min-w-[180px]"
          >
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Cari nama, no HP, email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent transition-colors"
              />
            </div>
            <button type="submit" className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors whitespace-nowrap">
              Cari
            </button>
          </form>

          {/* Tombol filter */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              hasActiveFilter
                ? "border-[#009182] text-[#009182] bg-teal-50"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filter
            {hasActiveFilter && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#009182]" />
            )}
          </button>

          {hasActiveFilter && (
            <button onClick={resetFilters} className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Reset
            </button>
          )}
        </div>

        {/* Panel filter expandable */}
        {filterOpen && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status Pipeline</label>
                <select
                  value={draftFilters.status}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                >
                  <option value="">Semua status</option>
                  {Object.entries(STATUS_META).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Sumber */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sumber Lead</label>
                <select
                  value={draftFilters.sumber}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, sumber: e.target.value }))}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                >
                  <option value="">Semua sumber</option>
                  {SUMBER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Cluster */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cluster</label>
                <select
                  value={draftFilters.minatClusterId}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, minatClusterId: e.target.value }))}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                >
                  <option value="">Semua cluster</option>
                  {clusterList.map((c) => (
                    <option key={c.id} value={c.id}>{c.namaCluster}</option>
                  ))}
                </select>
              </div>

              {/* Filter per sales — hanya tampil untuk role yang bisa lihat semua lead */}
              {canSeeAll && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sales PIC</label>
                  <select
                    value={draftFilters.salesPicId}
                    onChange={(e) => setDraftFilters((f) => ({ ...f, salesPicId: e.target.value }))}
                    className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                  >
                    <option value="">Semua sales</option>
                    <option value="unassigned">Belum di-assign</option>
                    {salesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tanggal dari */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Masuk (dari)</label>
                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                />
              </div>

              {/* Tanggal sampai */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Masuk (sampai)</label>
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  min={draftFilters.dateFrom || undefined}
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setDraftFilters(FILTERS_INITIAL); }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Bersihkan
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#009182] hover:bg-[#007a6e] rounded-lg transition-colors"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabel                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-2 text-sm text-gray-500">Memuat data lead...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#009182]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {hasActiveFilter ? (
              <>
                <p className="text-sm font-medium text-gray-700">Tidak ada lead yang cocok</p>
                <p className="text-xs text-gray-500 mt-1">Coba ubah atau hapus filter yang aktif</p>
                <button onClick={resetFilters} className="mt-3 text-xs text-[#009182] hover:underline">Reset filter</button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Belum ada lead</p>
                {canAdd && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] text-white text-sm font-medium hover:bg-[#007a6e] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Lead Pertama
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Nama / No HP</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Sumber</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Minat</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Status Pipeline</th>
                  {/* Kolom Sales PIC hanya tampil untuk role yang bisa lihat semua lead */}
                  {canSeeAll && (
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Sales PIC</th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Terakhir Dihubungi</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => {
                  const status = STATUS_META[lead.statusPipeline];
                  const { text: terakhir, alert: slaAlert } = labelTerakhirDihubungi(lead);

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Nama + No HP */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-teal-700">
                            {lead.nama.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="block font-medium text-gray-900 hover:text-[#009182] transition-colors truncate max-w-[160px]"
                            >
                              {lead.nama}
                            </Link>
                            <p className="text-xs text-gray-500 font-mono">{lead.noHp}</p>
                          </div>
                        </div>
                      </td>

                      {/* Sumber */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {SUMBER_OPTIONS.find((s) => s.value === lead.sumber)?.label ?? lead.sumber}
                        </span>
                      </td>

                      {/* Minat */}
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {lead.minatCluster && (
                            <p className="font-medium text-gray-700">{lead.minatCluster.namaCluster}</p>
                          )}
                          {lead.minatTipe && (
                            <p className="text-gray-500">{lead.minatTipe}</p>
                          )}
                          {!lead.minatCluster && !lead.minatTipe && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status?.color ?? "bg-gray-100 text-gray-700"}`}>
                            {status?.label ?? lead.statusPipeline}
                          </span>
                          {lead.tagKualifikasi && (
                            <span className="text-sm leading-none" title={lead.tagKualifikasi}>
                              {KUALIFIKASI_BADGE[lead.tagKualifikasi]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales PIC */}
                      {canSeeAll && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {lead.salesPic ? (
                            <span className="text-xs text-gray-700">{lead.salesPic.nama}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Belum di-assign
                            </span>
                          )}
                        </td>
                      )}

                      {/* Terakhir dihubungi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs ${slaAlert ? "text-red-600 font-medium" : "text-gray-500"}`}
                          title={slaAlert ? "Lebih dari 3 hari tanpa aktivitas" : undefined}
                        >
                          {slaAlert && (
                            <span className="mr-1" aria-label="Perlu follow-up">⚠️</span>
                          )}
                          {terakhir}
                        </span>
                      </td>

                      {/* Detail link */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="opacity-0 group-hover:opacity-100 text-xs text-[#009182] hover:text-[#007a6e] font-medium transition-opacity whitespace-nowrap"
                        >
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
              Menampilkan {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} lead
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 py-1 text-xs text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Halaman berikutnya"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal form tambah lead                                               */}
      {/* ------------------------------------------------------------------ */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Tambah Lead Baru</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Tutup"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <TambahLeadForm
                onSuccess={() => { fetchLeads(); setShowForm(false); }}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export dengan Suspense — diperlukan karena useSession pakai context
// ---------------------------------------------------------------------------
export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-5 h-5 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <LeadsPageContent />
    </Suspense>
  );
}
