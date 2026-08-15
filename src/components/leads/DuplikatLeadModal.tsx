"use client";

/**
 * Modal peringatan duplikat lead — PRD 5.1 & 6.1 langkah 3
 *
 * Muncul saat nomor HP yang diinput sudah ada di sistem.
 * User bisa memilih:
 * 1. "Gabungkan" — lead baru ditandai sebagai duplikat dari lead lama
 * 2. "Tetap Buat Baru" — buat lead terpisah (minat unit berbeda, dll)
 */

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface DuplikatLead {
  id: string;
  nama: string;
  noHp: string;
  statusPipeline: string;
  createdAt: string;
  salesPic: { id: string; nama: string } | null;
}

interface DuplikatLeadModalProps {
  duplikat: DuplikatLead;
  onGabung: (leadId: string) => void;
  onBuatBaru: () => void;
  onBatal: () => void;
  isLoading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  BARU: "Baru",
  DIHUBUNGI: "Dihubungi",
  KUALIFIKASI: "Kualifikasi",
  SITE_VISIT: "Site Visit",
  NEGOSIASI: "Negosiasi",
  BOOKING: "Booking",
  CLOSING: "Closing",
  LOST: "Lost",
};

export default function DuplikatLeadModal({
  duplikat,
  onGabung,
  onBuatBaru,
  onBatal,
  isLoading = false,
}: DuplikatLeadModalProps) {
  const tanggalMasuk = format(new Date(duplikat.createdAt), "d MMMM yyyy", {
    locale: localeId,
  });

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplikat-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h2
              id="duplikat-title"
              className="text-sm font-semibold text-gray-900"
            >
              Lead ini sudah pernah masuk
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Nomor HP <span className="font-medium text-gray-700">{duplikat.noHp}</span> sudah
              terdaftar di sistem
            </p>
          </div>
        </div>

        {/* Info lead lama */}
        <div className="p-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-xs font-medium text-amber-800 mb-2">
              Data lead yang sudah ada:
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Nama</span>
                <span className="text-xs font-semibold text-amber-900">
                  {duplikat.nama}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Ditangani oleh</span>
                <span className="text-xs font-semibold text-amber-900">
                  {duplikat.salesPic?.nama ?? "Belum di-assign"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Masuk sejak</span>
                <span className="text-xs font-semibold text-amber-900">
                  {tanggalMasuk}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Status pipeline</span>
                <span className="text-xs font-semibold text-amber-900">
                  {STATUS_LABELS[duplikat.statusPipeline] ?? duplikat.statusPipeline}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Pilih tindakan yang sesuai:
          </p>

          <div className="space-y-2.5">
            {/* Opsi 1: Gabungkan */}
            <button
              onClick={() => onGabung(duplikat.id)}
              disabled={isLoading}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-teal-200 bg-teal-50 hover:border-[#009182] hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm font-semibold text-teal-800">
                Gabungkan ke lead yang ada
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                Lead baru ditandai sebagai minat ulang — histori tetap di lead{" "}
                {duplikat.nama}
              </p>
            </button>

            {/* Opsi 2: Tetap buat baru */}
            <button
              onClick={onBuatBaru}
              disabled={isLoading}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm font-semibold text-gray-800">
                Tetap buat lead baru
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Buat sebagai lead terpisah — cocok jika berminat unit yang berbeda
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onBatal}
            disabled={isLoading}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Batal — kembali ke form
          </button>
        </div>
      </div>
    </div>
  );
}
