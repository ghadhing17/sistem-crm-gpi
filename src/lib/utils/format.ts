/**
 * Utility functions umum — format currency, tanggal, string, dll.
 */

/**
 * Format angka ke format Rupiah.
 * Contoh: formatRupiah(500000000) → "Rp 500.000.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format Indonesia.
 * Contoh: formatTanggal(new Date()) → "15 Agustus 2026"
 */
export function formatTanggal(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format tanggal + waktu.
 * Contoh: formatTanggalWaktu(new Date()) → "15 Agustus 2026, 14:30"
 */
export function formatTanggalWaktu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Hitung selisih hari dari tanggal tertentu hingga sekarang.
 * Berguna untuk badge "X hari tanpa aktivitas" di kanban lead.
 */
export function hariSejak(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gabungkan class names (pengganti ringkas untuk clsx/cn).
 * Cukup untuk kebutuhan dasar tanpa tambahan dependency.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Masking nomor KTP/NPWP — tampilkan sebagian karakter di tengah dengan bullet.
 * Contoh: maskNomorId("3201234567890001") → "3201••••••••0001"
 */
export function maskNomorId(nomor: string): string {
  if (nomor.length <= 8) return nomor;
  const prefix = nomor.slice(0, 4);
  const suffix = nomor.slice(-4);
  const masked = "•".repeat(nomor.length - 8);
  return `${prefix}${masked}${suffix}`;
}

/**
 * Truncate teks panjang dengan ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
