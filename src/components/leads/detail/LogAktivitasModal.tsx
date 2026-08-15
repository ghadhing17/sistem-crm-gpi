"use client";

/**
 * LogAktivitasModal — modal untuk mencatat aktivitas ke timeline lead
 * PRD 5.3 & 6.1 langkah 9:
 * - Pilih jenis (Telepon/WA/Meeting/Site Visit/Catatan)
 * - Isi ringkasan
 * - Jenis WhatsApp: tampilkan template pesan + link wa.me pre-filled
 * - Opsional: set reminder follow-up berikutnya
 */

import { useState, useRef, useEffect, useTransition } from "react";
import type { Activity } from "./ActivityTimeline";

interface LogAktivitasModalProps {
  leadId: string;
  leadNama: string;
  noHp: string;
  onSimpan: (activity: Activity) => void;
  onTutup: () => void;
}

const JENIS_OPTIONS = [
  { value: "WHATSAPP",   label: "WhatsApp",   shortcut: "W" },
  { value: "TELEPON",    label: "Telepon",     shortcut: "T" },
  { value: "MEETING",    label: "Meeting",     shortcut: "M" },
  { value: "SITE_VISIT", label: "Site Visit",  shortcut: "S" },
  { value: "CATATAN",    label: "Catatan",     shortcut: "C" },
] as const;

// Template pesan WA untuk berbagai fase (PRD 5.3)
const WA_TEMPLATES = [
  {
    id: "welcome",
    label: "Pesan Perkenalan",
    pesan: (nama: string) =>
      `Halo ${nama}, perkenalkan saya dari tim marketing Graha Padma. Terima kasih sudah tertarik dengan properti kami.\n\nBoleh saya jelaskan lebih lanjut tentang cluster dan unit yang tersedia? Apakah ada waktu untuk berdiskusi singkat?`,
  },
  {
    id: "followup",
    label: "Follow-up Lanjutan",
    pesan: (nama: string) =>
      `Halo ${nama}, saya ingin menindaklanjuti pembicaraan kita sebelumnya mengenai properti di Graha Padma.\n\nAdakah pertanyaan yang ingin Anda tanyakan? Saya siap membantu.`,
  },
  {
    id: "sitevisit",
    label: "Ajakan Site Visit",
    pesan: (nama: string) =>
      `Halo ${nama}, kami mengundang Anda untuk melakukan kunjungan langsung ke lokasi Graha Padma.\n\nDengan melihat langsung, Anda bisa mendapatkan gambaran yang lebih jelas tentang unit dan fasilitasnya. Apakah Anda berminat untuk dijadwalkan?`,
  },
] as const;

export default function LogAktivitasModal({
  leadId,
  leadNama,
  noHp,
  onSimpan,
  onTutup,
}: LogAktivitasModalProps) {
  const [jenis, setJenis]           = useState<string>("WHATSAPP");
  const [ringkasan, setRingkasan]   = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [templateId, setTemplateId] = useState<string>("welcome");
  const [pesanWa, setPesanWa]       = useState(WA_TEMPLATES[0].pesan(leadNama));
  const [waSent, setWaSent]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ringkasanRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus ke ringkasan saat modal muncul
  useEffect(() => {
    setTimeout(() => ringkasanRef.current?.focus(), 50);
  }, []);

  // Saat jenis berubah ke WhatsApp, isi ringkasan dengan template default
  useEffect(() => {
    if (jenis === "WHATSAPP" && !ringkasan) {
      setRingkasan("Mengirim pesan WhatsApp perkenalan kepada lead.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenis]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tmpl = WA_TEMPLATES.find((t) => t.id === id);
    if (tmpl) setPesanWa(tmpl.pesan(leadNama));
  }

  function handleBukaWa() {
    // Normalisasi nomor: pastikan format internasional tanpa +
    let hp = noHp.replace(/\D/g, "");
    if (hp.startsWith("0")) hp = "62" + hp.slice(1);
    const encoded = encodeURIComponent(pesanWa);
    window.open(`https://wa.me/${hp}?text=${encoded}`, "_blank", "noopener,noreferrer");
    setWaSent(true);
    // Auto-fill ringkasan setelah buka WA
    if (!ringkasan || ringkasan === "Mengirim pesan WhatsApp perkenalan kepada lead.") {
      const tmpl = WA_TEMPLATES.find((t) => t.id === templateId);
      setRingkasan(`Mengirim pesan WhatsApp via template "${tmpl?.label ?? ""}".`);
    }
  }

  async function handleSimpan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ringkasan.trim()) {
      setError("Ringkasan wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          jenis,
          ringkasan: ringkasan.trim(),
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan aktivitas");
        return;
      }
      onSimpan(json.data.activity);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-aktivitas-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="log-aktivitas-title" className="text-sm font-semibold text-gray-900">
            Log Aktivitas
          </h2>
          <button
            onClick={onTutup}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSimpan} className="px-5 py-4 space-y-4">
            {/* Pilih jenis */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Jenis Aktivitas</p>
              <div className="flex flex-wrap gap-2">
                {JENIS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setJenis(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      jenis === opt.value
                        ? "border-[#009182] bg-teal-50 text-[#009182]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel WhatsApp — template + link kirim */}
            {jenis === "WHATSAPP" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-green-800">Template Pesan WhatsApp</p>

                {/* Pilih template */}
                <div className="flex flex-wrap gap-1.5">
                  {WA_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        templateId === t.id
                          ? "bg-green-600 text-white"
                          : "bg-white border border-green-300 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Edit pesan */}
                <textarea
                  rows={5}
                  value={pesanWa}
                  onChange={(e) => setPesanWa(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-green-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  aria-label="Edit pesan WhatsApp"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBukaWa}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.548 4.085 1.505 5.8L.057 23.569l5.921-1.556A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.659-.52-5.169-1.422l-.371-.22-3.515.923.938-3.426-.242-.394A9.966 9.966 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                    </svg>
                    Kirim via WhatsApp
                  </button>
                  {waSent && (
                    <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Sudah dibuka
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Ringkasan */}
            <div>
              <label htmlFor="log-ringkasan" className="block text-xs font-medium text-gray-700 mb-1.5">
                Ringkasan Aktivitas <span className="text-red-500">*</span>
              </label>
              <textarea
                id="log-ringkasan"
                ref={ringkasanRef}
                rows={3}
                value={ringkasan}
                onChange={(e) => { setRingkasan(e.target.value); setError(null); }}
                placeholder={
                  jenis === "TELEPON"    ? "Contoh: Sudah dihubungi, customer tertarik tipe 45/90..." :
                  jenis === "WHATSAPP"   ? "Contoh: Sudah mengirim pesan perkenalan, menunggu balasan..." :
                  jenis === "MEETING"    ? "Contoh: Meeting di kantor, customer ingin site visit minggu depan..." :
                  jenis === "SITE_VISIT" ? "Contoh: Site visit bersama customer, tertarik blok A-02..." :
                  "Catatan internal tentang lead ini..."
                }
                disabled={isPending}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 resize-none transition-colors ${
                  error ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>

            {/* Reminder — opsional */}
            <div>
              <label htmlFor="log-reminder" className="block text-xs font-medium text-gray-700 mb-1.5">
                Reminder Follow-up Berikutnya{" "}
                <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                id="log-reminder"
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50"
              />
            </div>
          </form>
        </div>

        {/* Footer tombol */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onTutup}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSimpan}
            disabled={isPending || !ringkasan.trim()}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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
              "Simpan Aktivitas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
