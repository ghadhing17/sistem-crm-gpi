/**
 * Validasi Zod untuk Booking — CRM Graha Padma
 * PRD 5.5 & 6.2 langkah 5
 */

import { z } from "zod";

export const SkemaPembayaranValues = ["CASH", "KPR", "CASH_BERTAHAP"] as const;

export const createBookingSchema = z.object({
  leadId:           z.string().cuid("ID lead tidak valid"),
  unitId:           z.string().cuid("ID unit tidak valid"),
  hargaNormal:      z.coerce.number().positive("Harga normal harus lebih dari 0"),
  hargaDeal:        z.coerce.number().positive("Harga deal harus lebih dari 0"),
  diskonPersen:     z.coerce.number().min(0).max(100).default(0),
  alasanDiskon:     z.string().max(500).trim().optional().nullable(),
  skemaPembayaran:  z.enum(SkemaPembayaranValues, {
    errorMap: () => ({ message: "Skema pembayaran tidak valid" }),
  }),
  bookingFee:           z.coerce.number().min(0).optional().nullable(),
  targetPelunasanDp:    z.string().datetime().optional().nullable(),
}).refine(
  (d) => d.hargaDeal <= d.hargaNormal,
  { message: "Harga deal tidak boleh melebihi harga normal", path: ["hargaDeal"] }
);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const approveBookingSchema = z.object({
  aksi:           z.enum(["setujui", "tolak"]),
  alasanDitolak:  z.string().min(3, "Alasan penolakan minimal 3 karakter").max(500).trim().optional(),
}).refine(
  (d) => !(d.aksi === "tolak" && !d.alasanDitolak),
  { message: "Alasan wajib diisi jika menolak booking", path: ["alasanDitolak"] }
);

export type ApproveBookingInput = z.infer<typeof approveBookingSchema>;
