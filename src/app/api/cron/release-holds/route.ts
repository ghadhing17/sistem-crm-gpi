/**
 * POST /api/cron/release-holds — auto-release hold unit yang expired
 *
 * Dipanggil oleh cron job setiap 15 menit.
 * Proteksi via Authorization: Bearer <CRON_SECRET>
 *
 * Logika:
 * - Cari semua lead yang holdExpiredAt < now dan holdUnitId tidak null
 * - Kembalikan unit ke TERSEDIA
 * - Hapus holdUnitId + holdExpiredAt dari lead
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Cari lead dengan hold yang sudah expired
    const expiredLeads = await prisma.lead.findMany({
      where: {
        holdUnitId:    { not: null },
        holdExpiredAt: { lte: now },
      },
      select: {
        id:         true,
        holdUnitId: true,
        nama:       true,
      },
    });

    if (expiredLeads.length === 0) {
      return NextResponse.json({ data: { released: 0 } });
    }

    const unitIds = expiredLeads.map((l) => l.holdUnitId!).filter(Boolean);

    // Jalankan dalam transaksi: kembalikan unit + hapus hold dari lead
    await prisma.$transaction([
      // Kembalikan semua unit yang hold-nya expired ke TERSEDIA
      prisma.unit.updateMany({
        where: {
          id:     { in: unitIds },
          status: "NEGOSIASI",
        },
        data: { status: "TERSEDIA" },
      }),
      // Hapus hold dari semua lead yang expired
      prisma.lead.updateMany({
        where: {
          id: { in: expiredLeads.map((l) => l.id) },
        },
        data: {
          holdUnitId:   null,
          holdExpiredAt: null,
        },
      }),
    ]);

    console.log(`[CRON release-holds] Released ${expiredLeads.length} expired holds`);

    return NextResponse.json({
      data: {
        released: expiredLeads.length,
        units:    unitIds,
      },
    });
  } catch (err) {
    console.error("[POST /api/cron/release-holds]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
