/**
 * PATCH /api/leads/[id]/assign — assign lead ke sales tertentu
 * PRD 6.1 langkah 6: Manager pilih sales → klik "Assign"
 *
 * Otorisasi: hanya Sales Manager, Admin BO, dan Super Admin
 * Body: { salesPicId: string }
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from "@/lib/utils/api";
import { canReassignLead } from "@/lib/auth/permissions";
import { notifLeadDiassign } from "@/lib/notifications";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

const assignSchema = z.object({
  salesPicId: z.string().cuid("ID sales tidak valid"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    if (!canReassignLead(user)) {
      return apiForbidden("Hanya Sales Manager atau Admin BO yang bisa assign lead");
    }

    const { id } = await params;
    const body = await req.json();
    const { salesPicId } = assignSchema.parse(body);

    // Pastikan lead ada
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, nama: true, salesPicId: true },
    });
    if (!lead) return apiNotFound("Lead tidak ditemukan");

    // Pastikan sales target ada dan aktif
    const salesTarget = await prisma.user.findUnique({
      where: { id: salesPicId, statusAktif: true },
      select: { id: true, nama: true, role: true },
    });
    if (!salesTarget) return apiNotFound("Sales tidak ditemukan atau tidak aktif");

    // Update assignment
    const updated = await prisma.lead.update({
      where: { id },
      data:  { salesPicId },
      select: {
        id:             true,
        nama:           true,
        statusPipeline: true,
        salesPic:       { select: { id: true, nama: true } },
      },
    });

    // Notifikasi ke sales yang baru di-assign (fire-and-forget)
    notifLeadDiassign({
      salesId:  salesPicId,
      leadId:   lead.id,
      leadNama: lead.nama,
    }).catch(() => {});

    return apiSuccess({ lead: updated });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/leads/[id]/assign]", err);
    return apiServerError();
  }
}
