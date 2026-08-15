/**
 * GET /api/dashboard/admin — data dashboard untuk role Admin
 * PRD 5.8: dashboard operasional Admin
 *
 * Mengembalikan:
 * 1. Booking yang menunggu diproses (status DISETUJUI, belum selesai)
 * 2. Transaksi dengan tahap checklist berstatus "Perlu Perhatian" (macet > X hari)
 * 3. Ringkasan jumlah booking per tahap checklist aktif
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiUnauthorized, apiForbidden, apiServerError } from "@/lib/utils/api";
import type { UserRole } from "@/types";

const MACET_HARI = parseInt(process.env.NEXT_PUBLIC_CHECKLIST_MACET_HARI ?? "7");

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return apiForbidden("Hanya Admin yang bisa mengakses data ini");
    }

    const now = new Date();
    const macetCutoff = new Date(now.getTime() - MACET_HARI * 24 * 60 * 60 * 1000);

    const [bookingMenunggu, checklistMacet, ringkasanTahap] = await Promise.all([

      // -----------------------------------------------------------------------
      // 1. Booking DISETUJUI yang menunggu diproses (belum semua tahap selesai)
      // -----------------------------------------------------------------------
      prisma.booking.findMany({
        where: {
          status: "DISETUJUI",
        },
        select: {
          id: true, createdAt: true, updatedAt: true,
          lead:  { select: { id: true, nama: true, noHp: true } },
          unit:  { select: { blok: true, noKavling: true, tipe: true, cluster: { select: { namaCluster: true } } } },
          sales: { select: { nama: true } },
          checklists: {
            select: { tahap: true, status: true },
            orderBy: { tahap: "asc" },
          },
        },
        orderBy: { updatedAt: "asc" }, // yang paling lama diproses dulu
        take: 20,
      }),

      // -----------------------------------------------------------------------
      // 2. Tahap checklist yang macet (DIPROSES/BERMASALAH, tidak update > X hari)
      // -----------------------------------------------------------------------
      prisma.bookingChecklist.findMany({
        where: {
          status:    { in: ["DIPROSES", "BERMASALAH"] },
          updatedAt: { lt: macetCutoff },
        },
        select: {
          id: true, tahap: true, namaTahap: true, status: true,
          updatedAt: true, targetDate: true, catatan: true,
          booking: {
            select: {
              id: true,
              lead:  { select: { id: true, nama: true } },
              unit:  { select: { blok: true, noKavling: true, cluster: { select: { namaCluster: true } } } },
              sales: { select: { nama: true } },
            },
          },
        },
        orderBy: { updatedAt: "asc" }, // yang paling lama macet dulu
        take: 30,
      }),

      // -----------------------------------------------------------------------
      // 3. Ringkasan: jumlah checklist per kombinasi (tahap, status)
      // -----------------------------------------------------------------------
      prisma.bookingChecklist.groupBy({
        by:     ["tahap", "status"],
        where:  { booking: { status: "DISETUJUI" } },
        _count: { _all: true },
        orderBy: { tahap: "asc" },
      }),
    ]);

    // Hitung tahap terkini per booking (tahap pertama yang belum SELESAI)
    const bookingMenungguWithProgress = bookingMenunggu.map((b) => {
      const currentTahap = b.checklists.find((c) => c.status !== "SELESAI");
      const completedCount = b.checklists.filter((c) => c.status === "SELESAI").length;
      return {
        ...b,
        currentTahap:   currentTahap?.tahap ?? 6,
        completedCount,
        totalTahap:     b.checklists.length,
      };
    });

    // Hitung hari macet per checklist
    const checklistMacetWithDays = checklistMacet.map((c) => ({
      ...c,
      hariMacet: Math.floor((now.getTime() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Susun ringkasan per tahap
    const ringkasanMap: Record<number, Record<string, number>> = {};
    for (const item of ringkasanTahap) {
      if (!ringkasanMap[item.tahap]) ringkasanMap[item.tahap] = {};
      ringkasanMap[item.tahap][item.status] = item._count._all;
    }

    const TAHAP_NAMES = [
      "Pembayaran Booking Fee/DP",
      "Kelengkapan Dokumen Customer",
      "Pengajuan KPR ke Bank",
      "Status Approval Bank",
      "Penandatanganan Akad Kredit",
      "Pelunasan & Serah Terima Kunci",
    ];
    const ringkasanPerTahap = TAHAP_NAMES.map((nama, i) => ({
      tahap: i + 1,
      namaTahap: nama,
      ...(ringkasanMap[i + 1] ?? {}),
    }));

    return apiSuccess({
      bookingMenunggu: bookingMenungguWithProgress,
      checklistMacet:  checklistMacetWithDays,
      macetCount:      checklistMacetWithDays.length,
      ringkasanPerTahap,
    });
  } catch (err) {
    console.error("[GET /api/dashboard/admin]", err);
    return apiServerError();
  }
}
