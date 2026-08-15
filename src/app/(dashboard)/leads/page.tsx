"use client";

/**
 * Halaman Daftar Lead — CRM Graha Padma
 * PRD 5.1: tabel lead, tombol Tambah Lead, form dengan deteksi duplikat
 */

import { useState, useEffect, useCallback } from "react";
import TambahLeadForm from "@/components/leads/TambahLeadForm";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

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
}

// ---------------------------------------------------------------------------
// Konstanta label
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BARU: { label: "Baru", color: "bg-blue-100 text-blue-700" },
  DIHUBUNGI: { label: "Dihubungi", color: "bg-sky-100 text-sky-700" },
  KUALIFIKASI: { label: "Kualifikasi", color: "bg-purple-100 text-purple-700" },
  SITE_VISIT: { label: "Site Visit", color: "bg-orange-100 text-orange-700" },
  NEGOSIASI: { label: "Negosiasi", color: "bg-amber-100 text-amber-700" },
  BOOKING: { label: "Booking", color: "bg-teal-100 text-teal-700" },
  CLOSING: { label: "Closing", color: "bg-green-100 text-green-700" },
  LOST: { label: "Lost", color: "bg-red-100 text-red-700" },
};

const SUMBER_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  TELEPON: "Telepon",
  WEBSITE: "Website",
  FACEBOOK_ADS: "Facebook Ads",
  GOOGLE_ADS: "Google Ads",
  PAMERAN: "Pameran",
  REFERRAL: "Referral",
  INSTAGRAM: "Instagram",
  LAINNYA: "Lainnya",
};

const KUALIFIKASI_BADGE: Record<string, string> = {
  HOT: "🔴 Hot",
  WARM: "🟡 Warm",
  COLD: "🔵 Cold",
};

// ---------------------------------------------------------------------------
// Helper: hitung hari sejak updatedAt
// ---------------------------------------------------------------------------
function hariTanpaAktivitas(updatedAt: string): number {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const LIMIT = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      if (res.ok) {
        setLeads(json.data.leads);
        setTotal(json.data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleLeadAdded() {
    fetchLeads();
    setShowForm(false);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Daftar Lead</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} lead total` : "Belum ada lead"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/leads/pipeline"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Pipeline
          </a>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Lead
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, HP, email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors">
            Cari
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009182] bg-white text-gray-700"
          aria-label="Filter status"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {(search || statusFilter) && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setStatusFilter(""); setPage(1); }}
            className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 animate-spin text-[#009182]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#009182]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Belum ada lead</p>
            <p className="text-xs text-gray-500 mt-1">Klik "Tambah Lead" untuk menambahkan lead pertama</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Nama / Kontak</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Sumber</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Minat</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">PIC Sales</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Aktivitas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => {
                  const hari = hariTanpaAktivitas(lead.updatedAt);
                  const slaAlert = hari > 3;
                  const status = STATUS_LABELS[lead.statusPipeline];

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Nama & kontak */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-teal-700">
                              {lead.nama.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <a
                              href={`/leads/${lead.id}`}
                              className="font-medium text-gray-900 hover:text-[#009182] transition-colors"
                            >
                              {lead.nama}
                            </a>
                            <p className="text-xs text-gray-500">{lead.noHp}</p>
                          </div>
                        </div>
                      </td>

                      {/* Sumber */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {SUMBER_LABELS[lead.sumber] ?? lead.sumber}
                      </td>

                      {/* Minat */}
                      <td className="px-4 py-3">
                        {lead.minatCluster || lead.minatTipe ? (
                          <div>
                            {lead.minatCluster && (
                              <p className="text-xs font-medium text-gray-700">{lead.minatCluster.namaCluster}</p>
                            )}
                            {lead.minatTipe && (
                              <p className="text-xs text-gray-500">{lead.minatTipe}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Status + kualifikasi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status?.color ?? "bg-gray-100 text-gray-700"}`}>
                            {status?.label ?? lead.statusPipeline}
                          </span>
                          {lead.tagKualifikasi && (
                            <span className="text-xs">{KUALIFIKASI_BADGE[lead.tagKualifikasi]}</span>
                          )}
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {lead.salesPic?.nama ?? (
                          <span className="text-amber-600 font-medium">Belum di-assign</span>
                        )}
                      </td>

                      {/* Aktivitas + SLA */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">
                            {lead._count.activities} aktivitas
                          </span>
                          {slaAlert && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
                              title={`${hari} hari tanpa aktivitas`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                              </svg>
                              {hari}h
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3">
                        <a
                          href={`/leads/${lead.id}`}
                          className="text-xs text-[#009182] hover:text-[#007a6e] font-medium whitespace-nowrap"
                        >
                          Detail →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Halaman {page} dari {totalPages} ({total} lead)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal form tambah lead */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            {/* Header modal */}
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

            {/* Konten form */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <TambahLeadForm
                onSuccess={handleLeadAdded}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
