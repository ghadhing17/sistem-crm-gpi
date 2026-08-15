/**
 * GET   /api/bookings/[id]  — detail booking
 * PATCH /api/bookings/[id]  — approve atau tolak booking (Manager/Super Admin)
 *
 * PRD 6.2 langkah 6-8
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { approveBookingSchema } from "@/lib/validations/booking";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canApproveBooking, canViewBooking } from "@/lib/auth/permissions";
import { createNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

const BOOKING_SELECT = {
  id: true, status: true, skemaPembayaran: true,
  hargaNormal: true, hargaDeal: true, diskonPersen: true,
  alasanDiskon: true, alasanDitolak: true,
  bookingFee: true, targetPelunasanDp: true,
  approvedAt: true, createdAt: true, updatedAt: true,
  lead:  { select: { id: true, nama: true, noHp: true, email: true,
    minatCluster: { select: { namaCluster: true } } } },
  unit:  { select: { id: true, blok: true, noKavling: true, tipe: true,
    luasTanah: true, luasBangunan: true, harga: true,
    cluster: { select: { id: true, namaCluster: true, lokasi: true } } } },
  sales:    { select: { id: true, nama: true, email: true } },
  approver: { select: { id: true, nama: true } },
  checklists: {
    select: { id: true, tahap: true, namaTahap: true, status: true, targetDate: true, selesaiAt: true, catatan: true },
    orderBy: { tahap: "asc" as const },
  },
} as const;

function serializeBooking(b: { hargaNormal: bigint; hargaDeal: bigint; bookingFee: bigint | null; unit: { harga: bigint; [key: string]: unknown }; [key: string]: unknown }) {
  return {
    ...b,
    hargaNormal: b.hargaNormal.toString(),
    hargaDeal:   b.hargaDeal.toString(),
    bookingFee:  b.bookingFee?.toString() ?? null,
    unit: { ...b.unit, harga: b.unit.harga.toString() },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { ...BOOKING_SELECT, salesId: true },
    });

    if (!booking) return apiNotFound("Booking tidak ditemukan");

    if (!canViewBooking(user, { salesId: booking.salesId })) {
      return apiForbidden("Anda tidak punya akses ke booking ini");
    }

    return apiSuccess({ booking: serializeBooking(booking) });
  } catch (err) {
    console.error("[GET /api/bookings/[id]]", err);
    return apiServerError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canApproveBooking(user)) {
      return apiForbidden("Hanya Sales Manager atau Management yang bisa approve booking");
    }

    const { id } = await params;
    const body = await req.json();
    const { aksi, alasanDitolak, alasanBatalkan } = approveBookingSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true, status: true, salesId: true, unitId: true, leadId: true,
        unit:  { select: { blok: true, noKavling: true } },
        lead:  { select: { nama: true } },
        sales: { select: { id: true } },
      },
    });

    if (!booking) return apiNotFound("Booking tidak ditemukan");

    if (aksi === "batalkan") {
      // Batalkan bisa dari berbagai status — cek dulu sebelum guard MENUNGGU_APPROVAL
      const canCancel =
        user.role === "MANAGER" ||
        user.role === "SUPER_ADMIN" ||
        booking.salesId === user.id;
      if (!canCancel) {
        return apiForbidden("Anda tidak punya izin membatalkan booking ini");
      }
      if (["SELESAI", "DITOLAK", "DIBATALKAN"].includes(booking.status)) {
        return apiError(`Booking dengan status "${booking.status}" tidak bisa dibatalkan`, 409);
      }

      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data:  { status: "DIBATALKAN", alasanDitolak: alasanBatalkan ?? null },
        }),
        ...(booking.status === "DISETUJUI"
          ? [prisma.unit.update({ where: { id: booking.unitId }, data: { status: "TERSEDIA" } })]
          : []
        ),
      ]);

      const updated3 = await prisma.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
      return apiSuccess({ booking: serializeBooking(updated3!) });
    }

    if (booking.status !== "MENUNGGU_APPROVAL") {
      return apiError(`Booking tidak bisa di-approve/tolak karena statusnya "${booking.status}"`, 409);
    }

    if (aksi === "setujui") {
      // Approve: update booking + unit + lead dalam transaksi
      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: {
            status:     "DISETUJUI",
            approvedBy: user.id,
            approvedAt: new Date(),
          },
        }),
        prisma.unit.update({
          where: { id: booking.unitId },
          data:  { status: "BOOKED" },
        }),
        prisma.lead.update({
          where: { id: booking.leadId },
          data:  { holdUnitId: null, holdExpiredAt: null, statusPipeline: "BOOKING" },
        }),
      ]);

      // Buat 6 record checklist otomatis (PRD 5.6)
      const TAHAP_CHECKLIST = [
        { tahap: 1, namaTahap: "Pembayaran Booking Fee/DP" },
        { tahap: 2, namaTahap: "Kelengkapan Dokumen Customer" },
        { tahap: 3, namaTahap: "Pengajuan KPR ke Bank" },
        { tahap: 4, namaTahap: "Status Approval Bank" },
        { tahap: 5, namaTahap: "Penandatanganan Akad Kredit" },
        { tahap: 6, namaTahap: "Pelunasan & Serah Terima Kunci" },
      ];
      await prisma.bookingChecklist.createMany({
        data: TAHAP_CHECKLIST.map((t) => ({
          bookingId: id,
          tahap:     t.tahap,
          namaTahap: t.namaTahap,
          status:    "BELUM_MULAI" as const,
          // Tahap 1 langsung DIPROSES karena booking baru saja disetujui
          ...(t.tahap === 1 && { status: "DIPROSES" as const }),
        })),
        skipDuplicates: true, // idempotent jika sudah ada
      });

      // Notifikasi ke sales yang buat booking
      createNotification({
        userId:  booking.sales.id,
        jenis:   "BOOKING_DISETUJUI",
        pesan:   `Booking Anda untuk ${booking.lead.nama} — Unit Blok ${booking.unit.blok}-${booking.unit.noKavling} telah disetujui`,
        linkRef: `/bookings/${id}`,
        refId:   id,
      }).catch(() => {});

      // Notifikasi ke Admin
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, statusAktif: true },
        select: { id: true },
      });
      await Promise.allSettled(
        admins.map((a) =>
          createNotification({
            userId:  a.id,
            jenis:   "BOOKING_DISETUJUI",
            pesan:   `Booking disetujui: ${booking.lead.nama} — Unit Blok ${booking.unit.blok}-${booking.unit.noKavling}`,
            linkRef: `/bookings/${id}`,
            refId:   id,
          })
        )
      );
    } else {
      // Tolak: kembalikan unit ke status sebelumnya (cek apakah ada hold lead)
      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: {
            status:        "DITOLAK",
            alasanDitolak: alasanDitolak!,
          },
        }),
        // Kembalikan unit ke TERSEDIA (atau NEGOSIASI jika masih ada hold)
        prisma.unit.update({
          where: { id: booking.unitId },
          data:  { status: "TERSEDIA" },
        }),
      ]);

      // Notifikasi ke sales
      createNotification({
        userId:  booking.sales.id,
        jenis:   "BOOKING_DITOLAK",
        pesan:   `Booking Anda untuk ${booking.lead.nama} ditolak: "${alasanDitolak}"`,
        linkRef: `/bookings/${id}`,
        refId:   id,
      }).catch(() => {});
    }

    const updated = await prisma.booking.findUnique({
      where: { id },
      select: BOOKING_SELECT,
    });

    return apiSuccess({ booking: serializeBooking(updated!) });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/bookings/[id]]", err);
    return apiServerError();
  }
}
