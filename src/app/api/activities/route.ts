/**
 * GET /api/activities?leadId=... — ambil semua aktivitas untuk lead
 * POST /api/activities         — catat aktivitas baru
 *
 * Otorisasi:
 * - Sales Executive: hanya bisa log aktivitas ke lead miliknya
 * - Manager, Admin BO, Super Admin: semua lead
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createActivitySchema } from "@/lib/validations/activity";
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiError,
} from "@/lib/utils/api";
import { canViewLead, canEditLead } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// GET /api/activities?leadId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    const leadId = req.nextUrl.searchParams.get("leadId");

    if (!leadId) return apiError("Parameter leadId wajib diisi");

    // Cek apakah lead ada dan user berhak melihatnya
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, salesPicId: true },
    });
    if (!lead) return apiNotFound("Lead tidak ditemukan");
    if (!canViewLead(user, { salesPicId: lead.salesPicId })) {
      return apiForbidden("Anda tidak punya akses ke lead ini");
    }

    const activities = await prisma.activity.findMany({
      where: { leadId },
      select: {
        id: true,
        jenis: true,
        ringkasan: true,
        reminderAt: true,
        createdAt: true,
        user: { select: { id: true, nama: true, role: true } },
      },
      orderBy: { createdAt: "desc" }, // terbaru di atas
    });

    return apiSuccess({ activities });
  } catch (err) {
    console.error("[GET /api/activities]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/activities
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    const body = await req.json();
    const data = createActivitySchema.parse(body);

    // Cek lead ada dan user berhak mengeditnya
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      select: { id: true, salesPicId: true },
    });
    if (!lead) return apiNotFound("Lead tidak ditemukan");
    if (!canEditLead(user, { salesPicId: lead.salesPicId })) {
      return apiForbidden("Anda tidak bisa menambah aktivitas ke lead ini");
    }

    const activity = await prisma.activity.create({
      data: {
        leadId: data.leadId,
        jenis: data.jenis,
        ringkasan: data.ringkasan,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        createdBy: user.id,
      },
      select: {
        id: true,
        jenis: true,
        ringkasan: true,
        reminderAt: true,
        createdAt: true,
        user: { select: { id: true, nama: true, role: true } },
      },
    });

    // Update updatedAt lead agar SLA counter reset (PRD 6.1 langkah 11)
    await prisma.lead.update({
      where: { id: data.leadId },
      data: { updatedAt: new Date() },
    });

    return apiSuccess({ activity }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/activities]", err);
    return apiServerError();
  }
}
