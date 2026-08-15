/**
 * GET /api/leads/[id]    — detail lead
 * PATCH /api/leads/[id]  — update lead (partial)
 * DELETE /api/leads/[id] — hapus lead (Manager/Super Admin only)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { updateLeadSchema } from "@/lib/validations/lead";
import {
  apiSuccess, apiValidationError, apiUnauthorized,
  apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canViewLead, canEditLead, canUpdateLeadPipeline } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

// Field yang di-select untuk response lead — konsisten di semua endpoint
const LEAD_SELECT = {
  id: true,
  nama: true,
  noHp: true,
  email: true,
  sumber: true,
  statusPipeline: true,
  tagKualifikasi: true,
  minatTipe: true,
  alasanLost: true,
  catatanNegosiasi: true,
  isDuplikatDari: true,
  createdAt: true,
  updatedAt: true,
  salesPic: { select: { id: true, nama: true, role: true } },
  minatCluster: { select: { id: true, namaCluster: true, lokasi: true } },
  _count: { select: { activities: true, bookings: true, documents: true } },
} as const;

async function getLeadOrNotFound(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      salesPicId: true,
      statusPipeline: true,
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/leads/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const user = { id: session.user.id, role: session.user.role as UserRole };

    const leadRaw = await getLeadOrNotFound(id);
    if (!leadRaw) return apiNotFound("Lead tidak ditemukan");

    if (!canViewLead(user, { salesPicId: leadRaw.salesPicId })) {
      return apiForbidden("Anda tidak punya akses ke lead ini");
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: LEAD_SELECT,
    });

    return apiSuccess({ lead });
  } catch (err) {
    console.error("[GET /api/leads/[id]]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/leads/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const user = { id: session.user.id, role: session.user.role as UserRole };

    const leadRaw = await getLeadOrNotFound(id);
    if (!leadRaw) return apiNotFound("Lead tidak ditemukan");

    const body = await req.json();
    const data = updateLeadSchema.parse(body);

    // Cek izin edit data lead
    if (!canEditLead(user, { salesPicId: leadRaw.salesPicId })) {
      return apiForbidden("Anda tidak punya izin mengubah lead ini");
    }

    // Cek izin update status pipeline (lebih ketat dari edit)
    if (data.statusPipeline && data.statusPipeline !== leadRaw.statusPipeline) {
      if (!canUpdateLeadPipeline(user, { salesPicId: leadRaw.salesPicId })) {
        return apiForbidden("Anda tidak bisa mengubah status pipeline lead ini");
      }
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        statusPipeline: data.statusPipeline,
      },
      select: LEAD_SELECT,
    });

    return apiSuccess({ lead: updated });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/leads/[id]]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/leads/[id] — hanya Manager & Super Admin
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const user = { id: session.user.id, role: session.user.role as UserRole };

    // Hanya Manager dan Super Admin yang bisa hapus lead
    if (
      user.role !== "SALES_MANAGER" &&
      user.role !== "SUPER_ADMIN"
    ) {
      return apiForbidden("Hanya Sales Manager atau Super Admin yang bisa menghapus lead");
    }

    const leadRaw = await getLeadOrNotFound(id);
    if (!leadRaw) return apiNotFound("Lead tidak ditemukan");

    await prisma.lead.delete({ where: { id } });

    return apiSuccess({ message: "Lead berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/leads/[id]]", err);
    return apiServerError();
  }
}
