/**
 * GET /api/dashboard/manager — data dashboard untuk Sales Manager
 *
 * Mengembalikan:
 * 1. Funnel konversi tim: jumlah lead per tahap pipeline (semua sales dalam tim)
 * 2. Lead belum di-assign (salesPicId null)
 * 3. Daftar sales aktif dengan jumlah lead aktif masing-masing (workload)
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiServerError,
} from "@/lib/utils/api";
import { canViewAllLeads } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    if (!canViewAllLeads(user)) {
      return apiForbidden("Hanya Sales Manager ke atas yang bisa mengakses data ini");
    }

    const [funnelRaw, unassignedLeads, salesWorkload] = await Promise.all([
      // -----------------------------------------------------------------------
      // 1. Funnel: jumlah lead per status pipeline seluruh tim
      // -----------------------------------------------------------------------
      prisma.lead.groupBy({
        by:     ["statusPipeline"],
        _count: { _all: true },
      }),

      // -----------------------------------------------------------------------
      // 2. Lead belum di-assign (salesPicId null, bukan LOST/CLOSING)
      // -----------------------------------------------------------------------
      prisma.lead.findMany({
        where: {
          salesPicId:     null,
          statusPipeline: { notIn: ["LOST", "CLOSING"] },
        },
        select: {
          id:             true,
          nama:           true,
          noHp:           true,
          sumber:         true,
          statusPipeline: true,
          tagKualifikasi: true,
          createdAt:      true,
          minatCluster:   { select: { namaCluster: true } },
          minatTipe:      true,
        },
        orderBy: { createdAt: "asc" }, // yang paling lama belum di-assign
        take: 50,
      }),

      // -----------------------------------------------------------------------
      // 3. Workload per sales: jumlah lead aktif per sales
      // -----------------------------------------------------------------------
      prisma.user.findMany({
        where: {
          statusAktif: true,
          role: { in: ["SALES_EXECUTIVE", "SALES_MANAGER"] },
        },
        select: {
          id:   true,
          nama: true,
          role: true,
          _count: {
            select: {
              leadsAsPic: {
                where: { statusPipeline: { notIn: ["LOST", "CLOSING"] } },
              },
            },
          },
        },
        orderBy: { nama: "asc" },
      }),
    ]);

    // Susun funnel dalam urutan pipeline
    const FUNNEL_ORDER = [
      "BARU", "DIHUBUNGI", "KUALIFIKASI", "SITE_VISIT",
      "NEGOSIASI", "BOOKING", "CLOSING", "LOST",
    ];
    const funnelMap = Object.fromEntries(
      funnelRaw.map((f) => [f.statusPipeline, f._count._all])
    );
    const funnel = FUNNEL_ORDER.map((status) => ({
      status,
      count: funnelMap[status] ?? 0,
    }));

    return apiSuccess({
      funnel,
      unassignedLeads,
      unassignedCount: unassignedLeads.length,
      salesWorkload: salesWorkload.map((s) => ({
        id:          s.id,
        nama:        s.nama,
        role:        s.role,
        leadAktif:   s._count.leadsAsPic,
      })),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/manager]", err);
    return apiServerError();
  }
}
