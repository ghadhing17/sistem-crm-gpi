/**
 * GET /api/leads    — daftar lead dengan filter & pagination
 * POST /api/leads   — buat lead baru dengan cek duplikasi
 *
 * Otorisasi:
 * - Sales Executive: hanya bisa lihat lead miliknya (salesPicId === user.id)
 * - Manager, Admin BO, Management, Super Admin: semua lead
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createLeadSchema, listLeadsQuerySchema } from "@/lib/validations/lead";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiServerError,
} from "@/lib/utils/api";
import { canCreateLead, canViewAllLeads } from "@/lib/auth/permissions";
import { notifLeadDiassign } from "@/lib/notifications";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// GET /api/leads
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const query = listLeadsQuerySchema.parse(searchParams);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Sales Executive hanya bisa lihat lead miliknya
    if (!canViewAllLeads(user)) {
      where.salesPicId = user.id;
    } else if (query.salesPicId) {
      where.salesPicId = query.salesPicId;
    }

    if (query.status) where.statusPipeline = query.status;
    if (query.sumber) where.sumber = query.sumber;
    if (query.minatClusterId) where.minatClusterId = query.minatClusterId;

    // Filter rentang tanggal dibuat
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom + "T00:00:00.000Z") }),
        ...(query.dateTo && { lte: new Date(query.dateTo + "T23:59:59.999Z") }),
      };
    }

    if (query.search) {
      where.OR = [
        { nama: { contains: query.search, mode: "insensitive" } },
        { noHp: { contains: query.search } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          nama: true,
          noHp: true,
          email: true,
          sumber: true,
          statusPipeline: true,
          tagKualifikasi: true,
          minatTipe: true,
          createdAt: true,
          updatedAt: true,
          salesPic: { select: { id: true, nama: true } },
          minatCluster: { select: { id: true, namaCluster: true } },
          _count: { select: { activities: true } },
          // Ambil aktivitas terakhir untuk kolom "Terakhir Dihubungi" (PRD Bab 7 poin 4)
          activities: {
            select: { createdAt: true, jenis: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return apiSuccess({
      leads,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[GET /api/leads]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/leads
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    if (!canCreateLead(user)) {
      return apiForbidden("Role Anda tidak bisa membuat lead");
    }

    const body = await req.json();
    const data = createLeadSchema.parse(body);

    // -----------------------------------------------------------------------
    // Cek duplikasi berdasarkan noHp
    // -----------------------------------------------------------------------
    const duplikat = await prisma.lead.findFirst({
      where: { noHp: data.noHp },
      select: {
        id: true,
        nama: true,
        noHp: true,
        statusPipeline: true,
        createdAt: true,
        salesPic: { select: { id: true, nama: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Jika duplikat ditemukan DAN client belum kirim duplikatAction → kembalikan info duplikat
    if (duplikat && !data.duplikatAction) {
      return apiSuccess(
        {
          duplikat: {
            id: duplikat.id,
            nama: duplikat.nama,
            noHp: duplikat.noHp,
            statusPipeline: duplikat.statusPipeline,
            createdAt: duplikat.createdAt,
            salesPic: duplikat.salesPic,
          },
          requireAction: true,
        },
        409 // Conflict — client harus kirim ulang dengan duplikatAction
      );
    }

    // -----------------------------------------------------------------------
    // Tentukan salesPicId
    // -----------------------------------------------------------------------
    let salesPicId: string | null = null;

    if (data.salesPicId) {
      // Manager/Super Admin boleh assign langsung
      const canAssign =
        user.role === "SALES_MANAGER" ||
        user.role === "SUPER_ADMIN" ||
        user.role === "ADMIN_BACK_OFFICE";
      if (!canAssign) {
        return apiForbidden("Anda tidak bisa assign lead ke sales lain");
      }
      salesPicId = data.salesPicId;
    } else if (user.role === "SALES_EXECUTIVE") {
      // Sales Executive otomatis assign ke dirinya sendiri
      salesPicId = user.id;
    }
    // Manager yang input tidak otomatis assign ke diri sendiri — masuk "unassigned"

    // -----------------------------------------------------------------------
    // Buat lead
    // -----------------------------------------------------------------------
    const lead = await prisma.lead.create({
      data: {
        nama: data.nama,
        noHp: data.noHp,
        email: data.email ?? null,
        sumber: data.sumber,
        minatClusterId: data.minatClusterId ?? null,
        minatTipe: data.minatTipe ?? null,
        tagKualifikasi: data.tagKualifikasi ?? null,
        salesPicId,
        statusPipeline: "BARU",
        // Jika action "gabung", tandai lead ini sebagai duplikat dari lead lama
        isDuplikatDari:
          data.duplikatAction === "gabung" && data.duplikatLeadId
            ? data.duplikatLeadId
            : null,
      },
      select: {
        id: true,
        nama: true,
        noHp: true,
        email: true,
        sumber: true,
        statusPipeline: true,
        tagKualifikasi: true,
        minatTipe: true,
        createdAt: true,
        salesPic: { select: { id: true, nama: true } },
        minatCluster: { select: { id: true, namaCluster: true } },
      },
    });

    // Trigger notifikasi LEAD_DIASSIGN jika lead langsung di-assign ke sales (PRD 5.9)
    // Fire-and-forget — tidak boleh gagalkan response jika notifikasi error
    if (salesPicId && salesPicId !== user.id) {
      notifLeadDiassign({
        salesId:  salesPicId,
        leadId:   lead.id,
        leadNama: lead.nama,
      }).catch(() => {});
    }

    return apiSuccess({ lead }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/leads]", err);
    return apiServerError();
  }
}
