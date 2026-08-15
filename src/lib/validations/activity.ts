/**
 * Validasi schema untuk Activity — CRM Graha Padma
 */

import { z } from "zod";

export const JenisActivityValues = [
  "TELEPON",
  "WHATSAPP",
  "MEETING",
  "SITE_VISIT",
  "CATATAN",
] as const;

export const createActivitySchema = z.object({
  leadId: z.string().cuid("ID lead tidak valid"),
  jenis: z.enum(JenisActivityValues, {
    errorMap: () => ({ message: "Jenis aktivitas tidak valid" }),
  }),
  ringkasan: z
    .string()
    .min(3, "Ringkasan minimal 3 karakter")
    .max(2000, "Ringkasan maksimal 2000 karakter")
    .trim(),
  /// Waktu pengingat follow-up berikutnya — opsional (PRD 5.3)
  reminderAt: z
    .string()
    .datetime({ message: "Format waktu reminder tidak valid" })
    .optional()
    .nullable(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
