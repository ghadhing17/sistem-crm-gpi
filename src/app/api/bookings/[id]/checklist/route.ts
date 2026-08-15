/**
 * PATCH /api/bookings/[id]/checklist — update tahap checklist
 *
 * PRD 5.6 & 6.3: hanya Admin yang bisa update tahap
 *
 * Body: {
 *   tahap: number (1-6)
 *   status: StatusChecklist
 *   catatan?: string
 *   targetDate?: string (ISO)
 * }
 *
 * Otomasi:
 * - Tahap 5 (Akad Kredit) SELESAI → unit jadi TERJUAL
 * - Tahap 6 (Serah Terima) SELESAI → booking jadi SELESAI + lead jadi CLOSING
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { createNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

const TAHAP_AKAD    = 5;
const TAHAP_SELESAI = 6;

const checklistSchema = z.object({
  tahap:      z.coerce.number().int().min(1).max(6),
  status:     z.enum(["BELUM_MULAI", "DIPROSES", "SELESAI", "BERMASALAH"]),
  catatan:    z.string().max(1000).trim().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    // Hanya Admin & Super Admin yang bisa update tahap checklist
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return apiForbidden("Hanya Admin yang bisa memperbarui tahap checklist");
    }

    const { id: bookingId } = await params;
    const body = await req.json();
    const data = checklistSchema.parse(body);

    // Cek booking ada dan sudah DISETUJUI
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true, unitId: true, leadId: true, salesId: true,
        unit:  { select: { id: true, blok: true, noKavling: true } },
        lead:  { select: { id: true, nama: true } },
        sales: { select: { id: true } },
      },
    });
    if (!booking) return apiNotFound("Booking tidak ditemukan");

    if (!["DISETUJUI", "SELESAI"].includes(booking.status)) {
      return apiError(
        "Checklist hanya bisa diupdate pada booking yang sudah disetujui",
        409
      );
    }

    // Cari record checklist yang sudah ada
    const existingChecklist = await prisma.bookingChecklist.findUnique({
      where: { bookingId_tahap: { bookingId, tahap: data.tahap } },
    });

    if (!existingChecklist) {
      return apiNotFound(`Tahap ${data.tahap} tidak ditemukan untuk booking ini`);
    }

    const isSelesai  = data.status === "SELESAI";
    const selesaiAt  = isSelesai && existingChecklist.status !== "SELESAI"
      ? new Date()
      : existingChecklist.selesaiAt;

    // -----------------------------------------------------------------------
    // Update checklist
    // -----------------------------------------------------------------------
    const updatedChecklist = await prisma.bookingChecklist.update({
      where: { id: existingChecklist.id },
      data: {
        status:     data.status,
        catatan:    data.catatan ?? existingChecklist.catatan,
        targetDate: data.targetDate ? new Date(data.targetDate) : existingChecklist.targetDate,
        selesaiAt,
      },
    });

    // -----------------------------------------------------------------------
    // Otomasi berdasarkan tahap & status
    // -----------------------------------------------------------------------

    if (isSelesai && data.tahap === TAHAP_AKAD) {
      // Tahap 5 Akad Kredit selesai → unit jadi TERJUAL (PRD 6.3 langkah 6)
      await prisma.unit.update({
        where: { id: booking.unitId },
        data:  { status: "TERJUAL" },
      });

      // Notifikasi ke sales
      createNotification({
        userId:  booking.sales.id,
        jenis:   "CHECKLIST_UPDATE",
        pesan:   `Akad Kredit selesai — unit ${booking.unit?.blok}-${booking.unit?.noKavling} telah berubah status menjadi Terjual`,
        linkRef: `/bookings/${bookingId}`,
        refId:   bookingId,
      }).catch(() => {});
    }

    if (isSelesai && data.tahap === TAHAP_SELESAI) {
      // Tahap 6 Serah Terima selesai → booking SELESAI + lead CLOSING (PRD 6.3 langkah 7)
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data:  { status: "SELESAI" },
        }),
        prisma.lead.update({
          where: { id: booking.leadId },
          data:  { statusPipeline: "CLOSING" },
        }),
      ]);

      // Notifikasi ke sales bahwa transaksi selesai
      createNotification({
        userId:  booking.sales.id,
        jenis:   "CHECKLIST_UPDATE",
        pesan:   `Serah Terima Kunci selesai — transaksi ${booking.lead?.nama} telah CLOSING`,
        linkRef: `/bookings/${bookingId}`,
        refId:   bookingId,
      }).catch(() => {});

      // Notifikasi ke semua Manager
      const managers = await prisma.user.findMany({
        where: { role: { in: ["MANAGER", "SUPER_ADMIN"] }, statusAktif: true },
        select: { id: true },
      });
      await Promise.allSettled(
        managers.map((m) =>
          createNotification({
            userId:  m.id,
            jenis:   "CHECKLIST_UPDATE",
            pesan:   `Transaksi selesai: ${booking.lead?.nama} — Unit ${booking.unit?.blok}-${booking.unit?.noKavling}`,
            linkRef: `/bookings/${bookingId}`,
            refId:   bookingId,
          })
        )
      );
    }

    // Kirim notifikasi update tahap ke sales (untuk semua perubahan status)
    if (data.tahap !== TAHAP_SELESAI && data.tahap !== TAHAP_AKAD) {
      createNotification({
        userId:  booking.sales.id,
        jenis:   "CHECKLIST_UPDATE",
        pesan:   `Tahap ${data.tahap} checklist booking Anda diperbarui ke "${data.status}"`,
        linkRef: `/bookings/${bookingId}`,
        refId:   bookingId,
      }).catch(() => {});
    }

    // Ambil ulang data booking lengkap untuk response
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true,
        checklists: {
          select: {
            id: true, tahap: true, namaTahap: true, status: true,
            targetDate: true, selesaiAt: true, catatan: true, updatedAt: true,
          },
          orderBy: { tahap: "asc" },
        },
      },
    });

    return apiSuccess({ checklist: updatedChecklist, booking: updatedBooking });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/bookings/[id]/checklist]", err);
    return apiServerError();
  }
}
