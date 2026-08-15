"use client";

/**
 * Form Tambah Lead — CRM Graha Padma
 * PRD 5.1: nama, no HP/WA, sumber, cluster/tipe, catatan
 * Fitur: validasi client-side, deteksi duplikat, "Simpan & Tambah Lagi"
 */

import { useState, useEffect, useTransition } from "react";
import DuplikatLeadModal from "./DuplikatLeadModal";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

interface Cluster {
  id: string;
  namaCluster: string;
  lokasi: string;
}

interface DuplikatInfo {
  id: string;
  nama: string;
  noHp: string;
  statusPipeline: string;
  createdAt: string;
  salesPic: { id: string; nama: string } | null;
}

interface FormData {
  nama: string;
  noHp: string;
  email: string;
  sumber: string;
  minatClusterId: string;
  minatTipe: string;
  catatan: string;
  tagKualifikasi: string;
}

const FORM_INITIAL: FormData = {
  nama: "",
  noHp: "",
  email: "",
  sumber: "",
  minatClusterId: "",
  minatTipe: "",
  catatan: "",
  tagKualifikasi: "",
};

const SUMBER_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEPON", label: "Telepon" },
  { value: "WEBSITE", label: "Website" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "PAMERAN", label: "Pameran / Event" },
  { value: "REFERRAL", label: "Referral" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LAINNYA", label: "Lainnya" },
];

const KUALIFIKASI_OPTIONS = [
  { value: "HOT", label: "🔴 Hot", color: "text-red-600 bg-red-50 border-red-200" },
  { value: "WARM", label: "🟡 Warm", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "COLD", label: "🔵 Cold", color: "text-blue-600 bg-blue-50 border-blue-200" },
];

interface TambahLeadFormProps {
  onSuccess?: (lead: unknown) => void;
  onClose?: () => void;
}

export default function TambahLeadForm({ onSuccess, onClose }: TambahLeadFormProps) {
  const [form, setForm] = useState<FormData>(FORM_INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [duplikat, setDuplikat] = useState<DuplikatInfo | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Load clusters untuk dropdown
  useEffect(() => {
    fetch("/api/clusters")
      .then((r) => r.json())
      .then((res) => setClusters(res.data?.clusters ?? []))
      .catch(() => {});
  }, []);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Hapus error saat user mulai mengetik
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Validasi client-side minimal sebelum kirim ke server
  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nama.trim() || form.nama.trim().length < 2)
      newErrors.nama = "Nama minimal 2 karakter";
    if (!form.noHp.trim() || form.noHp.replace(/\D/g, "").length < 8)
      newErrors.noHp = "Nomor HP minimal 8 digit";
    if (!form.sumber) newErrors.sumber = "Pilih sumber lead";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Format email tidak valid";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function submitLead(
    formData: FormData,
    duplikatAction?: "baru" | "gabung",
    duplikatLeadId?: string
  ): Promise<boolean> {
    const payload = {
      nama: formData.nama.trim(),
      noHp: formData.noHp.trim(),
      email: formData.email.trim() || undefined,
      sumber: formData.sumber,
      minatClusterId: formData.minatClusterId || undefined,
      minatTipe: formData.minatTipe.trim() || undefined,
      catatan: formData.catatan.trim() || undefined,
      tagKualifikasi: formData.tagKualifikasi || undefined,
      duplikatAction,
      duplikatLeadId,
    };

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (res.status === 409 && json.data?.requireAction) {
      // Duplikat terdeteksi — tampilkan modal
      setDuplikat(json.data.duplikat);
      setPendingFormData(formData);
      return false;
    }

    if (!res.ok) {
      // Tampilkan error validasi dari server
      if (json.errors) {
        const serverErrors: Partial<Record<keyof FormData, string>> = {};
        for (const e of json.errors) {
          if (e.field in FORM_INITIAL) {
            serverErrors[e.field as keyof FormData] = e.message;
          }
        }
        setErrors(serverErrors);
      } else {
        setErrors({ nama: json.error ?? "Terjadi kesalahan server" });
      }
      return false;
    }

    onSuccess?.(json.data.lead);
    return true;
  }

  function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const ok = await submitLead(form);
      if (ok) {
        setSuccessCount((n) => n + 1);
        if (addAnother) {
          // Reset form tapi pertahankan sumber dan cluster (kemungkinan input beruntun saat pameran)
          setForm((prev) => ({
            ...FORM_INITIAL,
            sumber: prev.sumber,
            minatClusterId: prev.minatClusterId,
          }));
          setErrors({});
        } else {
          onClose?.();
        }
      }
    });
  }

  // Callback dari modal duplikat
  function handleGabung(leadId: string) {
    if (!pendingFormData) return;
    startTransition(async () => {
      const ok = await submitLead(pendingFormData, "gabung", leadId);
      if (ok) {
        setDuplikat(null);
        setPendingFormData(null);
        setSuccessCount((n) => n + 1);
        onClose?.();
      }
    });
  }

  function handleBuatBaru() {
    if (!pendingFormData) return;
    startTransition(async () => {
      const ok = await submitLead(pendingFormData, "baru");
      if (ok) {
        setDuplikat(null);
        setPendingFormData(null);
        setSuccessCount((n) => n + 1);
        onClose?.();
      }
    });
  }

  return (
    <>
      {/* Modal duplikat */}
      {duplikat && (
        <DuplikatLeadModal
          duplikat={duplikat}
          onGabung={handleGabung}
          onBuatBaru={handleBuatBaru}
          onBatal={() => {
            setDuplikat(null);
            setPendingFormData(null);
          }}
          isLoading={isPending}
        />
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} noValidate>
        {/* Banner sukses beruntun */}
        {successCount > 0 && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successCount} lead berhasil disimpan
          </div>
        )}

        <div className="space-y-4">
          {/* Nama */}
          <div>
            <label htmlFor="lead-nama" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              id="lead-nama"
              type="text"
              value={form.nama}
              onChange={(e) => setField("nama", e.target.value)}
              placeholder="Nama lengkap calon customer"
              disabled={isPending}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors ${
                errors.nama ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
          </div>

          {/* No HP */}
          <div>
            <label htmlFor="lead-nohp" className="block text-sm font-medium text-gray-700 mb-1.5">
              No. HP / WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              id="lead-nohp"
              type="tel"
              value={form.noHp}
              onChange={(e) => setField("noHp", e.target.value)}
              placeholder="08123456789"
              disabled={isPending}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors ${
                errors.noHp ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.noHp && <p className="mt-1 text-xs text-red-600">{errors.noHp}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-xs text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="email@domain.com"
              disabled={isPending}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors ${
                errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Sumber */}
          <div>
            <label htmlFor="lead-sumber" className="block text-sm font-medium text-gray-700 mb-1.5">
              Sumber Lead <span className="text-red-500">*</span>
            </label>
            <select
              id="lead-sumber"
              value={form.sumber}
              onChange={(e) => setField("sumber", e.target.value)}
              disabled={isPending}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors ${
                errors.sumber ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value="">Pilih sumber lead...</option>
              {SUMBER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.sumber && <p className="mt-1 text-xs text-red-600">{errors.sumber}</p>}
          </div>

          {/* Cluster & Tipe — 2 kolom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-cluster" className="block text-sm font-medium text-gray-700 mb-1.5">
                Minat Cluster
              </label>
              <select
                id="lead-cluster"
                value={form.minatClusterId}
                onChange={(e) => setField("minatClusterId", e.target.value)}
                disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors"
              >
                <option value="">Semua cluster</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.namaCluster}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-tipe" className="block text-sm font-medium text-gray-700 mb-1.5">
                Minat Tipe
              </label>
              <input
                id="lead-tipe"
                type="text"
                value={form.minatTipe}
                onChange={(e) => setField("minatTipe", e.target.value)}
                placeholder="36/72, 45/90..."
                disabled={isPending}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors"
              />
            </div>
          </div>

          {/* Tag Kualifikasi */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Kualifikasi <span className="text-xs text-gray-400 font-normal">(opsional)</span>
            </p>
            <div className="flex gap-2">
              {KUALIFIKASI_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setField("tagKualifikasi", form.tagKualifikasi === opt.value ? "" : opt.value)
                  }
                  disabled={isPending}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                    form.tagKualifikasi === opt.value
                      ? opt.color + " border-2"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label htmlFor="lead-catatan" className="block text-sm font-medium text-gray-700 mb-1.5">
              Catatan <span className="text-xs text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="lead-catatan"
              rows={3}
              value={form.catatan}
              onChange={(e) => setField("catatan", e.target.value)}
              placeholder="Catatan singkat: budget, kebutuhan khusus, jadwal site visit, dll."
              disabled={isPending}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          )}
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-[#009182] text-sm font-medium text-[#009182] hover:bg-teal-50 transition-colors disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan & Tambah Lagi"}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Menyimpan...
              </>
            ) : (
              "Simpan Lead"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
