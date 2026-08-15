/**
 * Validasi schema untuk Lead — CRM Graha Padma
 * Dipakai di API routes (server-side) dan bisa dipakai di form client untuk konsistensi.
 */

import { z } from "zod";

// Normalisasi nomor HP: hapus spasi, strip +62 jadi 0, pastikan format valid
function normalizeNoHp(val: string): string {
  let hp = val.replace(/\s+/g, "").replace(/-/g, "");
  if (hp.startsWith("+62")) hp = "0" + hp.slice(3);
  if (hp.startsWith("62") && hp.length > 10) hp = "0" + hp.slice(2);
  return hp;
}

export const SumberLeadValues = [
  "WHATSAPP",
  "TELEPON",
  "WEBSITE",
  "FACEBOOK_ADS",
  "GOOGLE_ADS",
  "PAMERAN",
  "REFERRAL",
  "INSTAGRAM",
  "LAINNYA",
] as const;

export const LeadStatusValues = [
  "BARU",
  "DIHUBUNGI",
  "KUALIFIKASI",
  "SITE_VISIT",
  "NEGOSIASI",
  "BOOKING",
  "CLOSING",
  "LOST",
] as const;

export const LeadKualifikasiValues = ["HOT", "WARM", "COLD"] as const;

// ---------------------------------------------------------------------------
// Schema CREATE lead — sesuai field PRD 5.1
// ---------------------------------------------------------------------------
export const createLeadSchema = z.object({
  nama: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .trim(),

  noHp: z
    .string()
    .min(8, "Nomor HP minimal 8 digit")
    .max(20, "Nomor HP maksimal 20 karakter")
    .transform(normalizeNoHp)
    .refine((val) => /^0\d{7,14}$/.test(val), {
      message: "Format nomor HP tidak valid (contoh: 08123456789)",
    }),

  email: z
    .string()
    .email("Format email tidak valid")
    .toLowerCase()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  sumber: z.enum(SumberLeadValues, {
    errorMap: () => ({ message: "Sumber lead tidak valid" }),
  }),

  minatClusterId: z.string().cuid("ID cluster tidak valid").optional().nullable(),

  minatTipe: z
    .string()
    .max(50, "Tipe maksimal 50 karakter")
    .trim()
    .optional()
    .nullable(),

  catatan: z
    .string()
    .max(1000, "Catatan maksimal 1000 karakter")
    .trim()
    .optional()
    .nullable(),

  tagKualifikasi: z
    .enum(LeadKualifikasiValues)
    .optional()
    .nullable(),

  // Hanya Manager/Super Admin boleh assign langsung saat create
  salesPicId: z.string().cuid("ID sales tidak valid").optional().nullable(),

  // Opsi duplikat: "baru" = tetap buat baru, "gabung" = tandai isDuplikatDari
  duplikatAction: z.enum(["baru", "gabung"]).optional(),
  duplikatLeadId: z.string().cuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// ---------------------------------------------------------------------------
// Schema UPDATE lead — semua field optional (partial update)
// ---------------------------------------------------------------------------
export const updateLeadSchema = z.object({
  nama: z.string().min(2).max(100).trim().optional(),
  noHp: z
    .string()
    .min(8)
    .max(20)
    .transform(normalizeNoHp)
    .refine((val) => /^0\d{7,14}$/.test(val))
    .optional(),
  email: z
    .string()
    .email()
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  sumber: z.enum(SumberLeadValues).optional(),
  minatClusterId: z.string().cuid().optional().nullable(),
  minatTipe: z.string().max(50).trim().optional().nullable(),
  catatan: z.string().max(1000).trim().optional().nullable(),
  tagKualifikasi: z.enum(LeadKualifikasiValues).optional().nullable(),
  salesPicId: z.string().cuid().optional().nullable(),
  statusPipeline: z.enum(LeadStatusValues).optional(),
  alasanLost: z
    .string()
    .max(500, "Alasan lost maksimal 500 karakter")
    .trim()
    .optional()
    .nullable(),
  catatanNegosiasi: z.string().max(1000).trim().optional().nullable(),
}).refine(
  (data) => {
    // Jika status diubah ke LOST, alasanLost wajib diisi
    if (data.statusPipeline === "LOST" && !data.alasanLost) return false;
    return true;
  },
  {
    message: "Alasan wajib diisi saat status diubah ke Lost",
    path: ["alasanLost"],
  }
);

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ---------------------------------------------------------------------------
// Query params untuk GET /api/leads
// ---------------------------------------------------------------------------
export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(LeadStatusValues).optional(),
  sumber: z.enum(SumberLeadValues).optional(),
  salesPicId: z.string().cuid().optional(),
  minatClusterId: z.string().cuid().optional(),
  /// Format: YYYY-MM-DD — filter lead berdasarkan tanggal dibuat
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD").optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "nama"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
