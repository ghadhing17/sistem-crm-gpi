/**
 * Validasi Zod untuk Cluster dan Unit — CRM Graha Padma
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Cluster
// ---------------------------------------------------------------------------

export const createClusterSchema = z.object({
  namaCluster: z.string().min(2, "Nama cluster minimal 2 karakter").max(100).trim(),
  lokasi:      z.string().min(3, "Lokasi minimal 3 karakter").max(255).trim(),
  deskripsi:   z.string().max(1000).trim().optional().nullable(),
});

export const updateClusterSchema = createClusterSchema.partial();

export type CreateClusterInput = z.infer<typeof createClusterSchema>;
export type UpdateClusterInput = z.infer<typeof updateClusterSchema>;

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export const StatusUnitValues = [
  "TERSEDIA",
  "NEGOSIASI",
  "BOOKED",
  "TERJUAL",
  "TIDAK_DIJUAL",
] as const;

export const createUnitSchema = z.object({
  clusterId:    z.string().cuid("ID cluster tidak valid"),
  blok:         z.string().min(1, "Blok wajib diisi").max(10).trim().toUpperCase(),
  noKavling:    z.string().min(1, "Nomor kavling wajib diisi").max(20).trim(),
  tipe:         z.string().min(1, "Tipe unit wajib diisi").max(50).trim(),
  luasTanah:    z.coerce.number().positive("Luas tanah harus lebih dari 0").max(99999),
  luasBangunan: z.coerce.number().positive("Luas bangunan harus lebih dari 0").max(99999),
  harga:        z.coerce.number().positive("Harga harus lebih dari 0").max(99_999_999_999),
  status:       z.enum(StatusUnitValues).default("TERSEDIA"),
  deskripsi:    z.string().max(1000).trim().optional().nullable(),
});

export const updateUnitSchema = z.object({
  blok:         z.string().min(1).max(10).trim().toUpperCase().optional(),
  noKavling:    z.string().min(1).max(20).trim().optional(),
  tipe:         z.string().min(1).max(50).trim().optional(),
  luasTanah:    z.coerce.number().positive().max(99999).optional(),
  luasBangunan: z.coerce.number().positive().max(99999).optional(),
  harga:        z.coerce.number().positive().max(99_999_999_999).optional(),
  status:       z.enum(StatusUnitValues).optional(),
  deskripsi:    z.string().max(1000).trim().optional().nullable(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
