/**
 * GET /api/dashboard/sales — data dashboard untuk Sales Executive
 *
 * Mengembalikan:
 * 1. Jumlah lead per status pipeline (hanya lead milik user ini)
 * 2. Daftar "perlu follow-up" — lead >3 hari tanpa aktivitas + reminder jatuh tempo
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/utils/api";

const SLA_HARI = 3; // Sesuai PRD — lead >3 hari tanpa aktivitas ditandai perlu follow-up

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const userId = session.user.id;
    const now    = new Date();
    const slaCutoff = new Date(now.getTime() - SLA_HARI * 24 * 60 * 60 * 1000);

    // -------------------------------------------------------------------------
    // 1. Jumlah lead per status (hanya lead milik sales ini, tidak termasuk LOST/CLOSING)
    // -------------------------------------------------------------------------
    const leadsByStatus = await prisma.lead.groupBy({
      by: ["statusPipeline"],
      where: { salesPicId: userId },
      _count: { _all: true },
    });

    // -------------------------------------------------------------------------
    // 2. Lead yang perlu follow-up:
    //    a) Lead aktif (bukan LOST/CLOSING) yang updatedAt < 3 hari lalu
    //    b) Lead yang punya reminder activity yang sudah jatuh tempo hari ini
    // -------------------------------------------------------------------------
    const [leadsSla, remindersHariIni] = await Promise.all([
      // Lead >3 hari tanpa aktivitas (updatedAt sebagai proxy terakhir disentuh)
      prisma.lead.findMany({
        where: {
          salesPicId:     userId,
          statusPipeline: { notIn: ["LOST", "CLOSING"] },
          updatedAt:      { lt: slaCutoff },
        },
        select: {
          id:             true,
          nama:           true,
          noHp:           true,
          statusPipeline: true,
          updatedAt:      true,
          minatCluster:   { select: { namaCluster: true } },
        },
        orderBy: { updatedAt: "asc" }, // paling lama tidak dihubungi dulu
        take: 20,
      }),

      // Activity yang reminderAt jatuh hari ini (00:00 - 23:59)
      prisma.activity.findMany({
        where: {
          createdBy:  userId,
          reminderAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
            lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
          },
        },
        select: {
          id:         true,
          reminderAt: true,
          ringkasan:  true,
          lead: {
            select: {
              id:             true,
              nama:           true,
              noHp:           true,
              statusPipeline: true,
              minatCluster:   { select: { namaCluster: true } },
            },
          },
        },
        orderBy: { reminderAt: "asc" },
        take: 20,
      }),
    ]);

    // -------------------------------------------------------------------------
    // 3. Total lead aktif (bukan LOST/CLOSING)
    // -------------------------------------------------------------------------
    const totalAktif = await prisma.lead.count({
      where: {
        salesPicId:     userId,
        statusPipeline: { notIn: ["LOST", "CLOSING"] },
      },
    });

    return apiSuccess({
      leadsByStatus: leadsByStatus.map((l) => ({
        status: l.statusPipeline,
        count:  l._count._all,
      })),
      totalAktif,
      slaLeads:    leadsSla,
      reminders:   remindersHariIni,
    });
  } catch (err) {
    console.error("[GET /api/dashboard/sales]", err);
    return apiServerError();
  }
}
