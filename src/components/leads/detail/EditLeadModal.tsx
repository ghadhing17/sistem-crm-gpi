"use client";

/**
 * EditLeadModal — form edit data lead
 * Memanggil PATCH /api/leads/[id] dengan data yang diubah
 */

import { useState, useEffect, useTransition } from "react";

interface Cluster { id: string; namaCluster: string; }

interface LeadData {
  nama: string;
  noHp: string;
  email: string | null;
  sumber: string;
  minatClusterId: string | null;
  minatTipe: string | null;
  tagKualifikasi: string | null;
  catatanNegosiasi: string | null;
}

interface EditLeadModalProps {
  leadId: string;
  initial: LeadData;
  onSimpan: (updated: LeadData) => void;
  onTutup: () => void;
}

const SUMBER_OPTIONS = [
  { value: "WHATSAPP",    label: "WhatsApp" },
  { value: "TELEPON",     label: "Telepon" },
  { value: "WEBSITE",     label: "Website" },
  { value: "FACEBOOK_ADS",label: "Facebook Ads" },
  { value: "GOOGLE_ADS",  label: "Google Ads" },
  { value: "PAMERAN",     label: "Pameran / Event" },
  { value: "REFERRAL",    label: "Referral" },
  { value: "INSTAGRAM",   label: "Instagram" },
  { value: "LAINNYA",     label: "Lainnya" },
];

const KUALIFIKASI_OPTIONS = [
  { value: "HOT",  label: "🔴 Hot",  color: "border-red-300 bg-red-50 text-red-700" },
  { value: "WARM", label: "🟡 Warm", color: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "COLD", label: "🔵 Cold", color: "border-blue-300 bg-blue-50 text-blue-700" },
];

export default function EditLeadModal({ leadId, initial, onSimpan, onTutup }: EditLeadModalProps) {
  const [form, setForm] = useState({
    nama:              initial.nama ?? "",
    noHp:              initial.noHp ?? "",
    email:             initial.email ?? "",
    sumber:            initial.sumber ?? "",
    minatClusterId:    initial.minatClusterId ?? "",
    minatTipe:         initial.minatTipe ?? "",
    tagKualifikasi:    initial.tagKualifikasi ?? "",
    catatanNegosiasi:  initial.catatanNegosiasi ?? "",
  });
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/clusters")
      .then((r) => r.json())
      .then((res) => setClusters(res.data?.clusters ?? []))
      .catch(() => {});
  }, []);

  function setField(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  function validate(): boolean {
    if (!form.nama.trim() || form.nama.trim().length < 2) {
      setError("Nama minimal 2 karakter"); return false;
    }
    if (!form.noHp.trim() || form.noHp.replace(/\D/g, "").length < 8) {
      setError("Nomor HP minimal 8 digit"); return false;
    }
    if (!form.sumber) { setError("Sumber lead wajib dipilih"); return false; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Format email tidak valid"); return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama:             form.nama.trim(),
          noHp:             form.noHp.trim(),
          email:            form.email.trim() || null,
          sumber:           form.sumber,
          minatClusterId:   form.minatClusterId || null,
          minatTipe:        form.minatTipe.trim() || null,
          tagKualifikasi:   form.tagKualifikasi || null,
          catatanNegosiasi: form.catatanNegosiasi.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menyimpan perubahan"); return; }

      onSimpan({
        nama:             json.data.lead.nama,
        noHp:             json.data.lead.noHp,
        email:            json.data.lead.email,
        sumber:           json.data.lead.sumber,
        minatClusterId:   json.data.lead.minatCluster?.id ?? null,
        minatTipe:        json.data.lead.minatTipe,
        tagKualifikasi:   json.data.lead.tagKualifikasi,
        catatanNegosiasi: form.catatanNegosiasi.trim() || null,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="edit-lead-title" className="text-sm font-semibold text-gray-900">Edit Data Lead</h2>
          <button onClick={onTutup} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <form onSubmit={handleSubmit} id="edit-lead-form" className="space-y-4">
            {/* Nama */}
            <div>
              <label htmlFor="el-nama" className="block text-xs font-medium text-gray-700 mb-1.5">
                Nama <span className="text-red-500">*</span>
              </label>
              <input id="el-nama" type="text" value={form.nama}
                onChange={(e) => setField("nama", e.target.value)}
                placeholder="Nama lengkap" disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
            </div>

            {/* No HP */}
            <div>
              <label htmlFor="el-nohp" className="block text-xs font-medium text-gray-700 mb-1.5">
                No. HP / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input id="el-nohp" type="tel" value={form.noHp}
                onChange={(e) => setField("noHp", e.target.value)}
                placeholder="08123456789" disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="el-email" className="block text-xs font-medium text-gray-700 mb-1.5">
                Email <span className="text-xs text-gray-400 font-normal">(opsional)</span>
              </label>
              <input id="el-email" type="email" value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="email@domain.com" disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
            </div>

            {/* Sumber */}
            <div>
              <label htmlFor="el-sumber" className="block text-xs font-medium text-gray-700 mb-1.5">
                Sumber Lead <span className="text-red-500">*</span>
              </label>
              <select id="el-sumber" value={form.sumber}
                onChange={(e) => setField("sumber", e.target.value)}
                disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50">
                <option value="">Pilih sumber...</option>
                {SUMBER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Cluster & Tipe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="el-cluster" className="block text-xs font-medium text-gray-700 mb-1.5">Minat Cluster</label>
                <select id="el-cluster" value={form.minatClusterId}
                  onChange={(e) => setField("minatClusterId", e.target.value)}
                  disabled={isPending}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50">
                  <option value="">Semua cluster</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>{c.namaCluster}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="el-tipe" className="block text-xs font-medium text-gray-700 mb-1.5">Minat Tipe</label>
                <input id="el-tipe" type="text" value={form.minatTipe}
                  onChange={(e) => setField("minatTipe", e.target.value)}
                  placeholder="36/72, 45/90..." disabled={isPending}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50" />
              </div>
            </div>

            {/* Kualifikasi */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">
                Kualifikasi <span className="text-xs text-gray-400 font-normal">(opsional)</span>
              </p>
              <div className="flex gap-2">
                {KUALIFIKASI_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setField("tagKualifikasi", form.tagKualifikasi === opt.value ? "" : opt.value)}
                    disabled={isPending}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                      form.tagKualifikasi === opt.value
                        ? `${opt.color} border-2`
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan Negosiasi */}
            <div>
              <label htmlFor="el-catatan" className="block text-xs font-medium text-gray-700 mb-1.5">
                Catatan Negosiasi <span className="text-xs text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea id="el-catatan" rows={3} value={form.catatanNegosiasi}
                onChange={(e) => setField("catatanNegosiasi", e.target.value)}
                placeholder="Harga penawaran, catatan negosiasi, preferensi customer..."
                disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50 resize-none" />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button type="button" onClick={onTutup} disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Batal
          </button>
          <button type="submit" form="edit-lead-form" disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
            {isPending ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menyimpan...</>
            ) : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
