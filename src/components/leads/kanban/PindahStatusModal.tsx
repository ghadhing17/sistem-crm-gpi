"use client";

/**
 * PindahStatusModal — modal konfirmasi saat kartu di-drag ke kolom baru
 * PRD 5.2: catatan perubahan status, WAJIB diisi untuk kolom "Lost"
 */

import { useState, useRef, useEffect } from "react";
import { COLUMN_META } from "./KanbanColumn";

interface PindahStatusModalProps {
  leadNama: string;
  statusDari: string;
  statusKe: string;
  onKonfirmasi: (catatan: string) => void;
  onBatal: () => void;
  isLoading?: boolean;
}

export default function PindahStatusModal({
  leadNama,
  statusDari,
  statusKe,
  onKonfirmasi,
  onBatal,
  isLoading = false,
}: PindahStatusModalProps) {
  const [catatan, setCatatan] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLost = statusKe === "LOST";
  const metaDari = COLUMN_META[statusDari];
  const metaKe   = COLUMN_META[statusKe];

  useEffect(() => {
    // Auto-focus textarea saat modal muncul
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLost && !catatan.trim()) return;
    onKonfirmasi(catatan.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pindah-title"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 id="pindah-title" className="text-sm font-semibold text-gray-900 mb-1">
            Pindah Status Lead
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">{leadNama}</span>
          </p>

          {/* Visualisasi status dari → ke */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${metaDari?.headerBg ?? "bg-gray-100"} text-gray-700`}>
              <span className={`w-1.5 h-1.5 rounded-full ${metaDari?.color ?? "bg-gray-400"}`} />
              {metaDari?.label ?? statusDari}
            </span>
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${metaKe?.headerBg ?? "bg-gray-100"} text-gray-700`}>
              <span className={`w-1.5 h-1.5 rounded-full ${metaKe?.color ?? "bg-gray-400"}`} />
              {metaKe?.label ?? statusKe}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <label htmlFor="catatan-pindah" className="block text-xs font-medium text-gray-700 mb-1.5">
            {isLost ? (
              <>Alasan Lost <span className="text-red-500">*</span></>
            ) : (
              <>Catatan perubahan <span className="text-gray-400 font-normal">(opsional)</span></>
            )}
          </label>
          <textarea
            id="catatan-pindah"
            ref={inputRef}
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              isLost
                ? "Jelaskan alasan lead ini tidak lanjut (budget tidak sesuai, pilih developer lain, tidak responsif, dll.)"
                : "Catatan singkat tentang perubahan status ini..."
            }
            disabled={isLoading}
            className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009182] focus:border-transparent disabled:opacity-50 resize-none transition-colors ${
              isLost && !catatan.trim() ? "border-red-300" : "border-gray-300"
            }`}
          />
          {isLost && !catatan.trim() && (
            <p className="mt-1 text-xs text-red-600">Alasan wajib diisi untuk status Lost</p>
          )}

          {/* Tombol aksi */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onBatal}
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || (isLost && !catatan.trim())}
              className="flex-1 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                "Konfirmasi Pindah"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
