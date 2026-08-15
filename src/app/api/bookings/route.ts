/**
 * GET  /api/bookings  — daftar booking dengan filter & pagination
 * POST /api/bookings  — buat booking baru dari lead (PRD 5.5 & 6.2 langkah 5)
 *
 * Logika approval diskon:
 * - Hitung diskonPersen = ((hargaNormal - hargaDeal) / hargaNormal) * 100
 * - Jika > threshold (default 5%, konfigurasi via env DISKON_THRESHOLD_PERSEN):
 *   → status = MENUNGGU_APPROVAL, kirim notifikasi ke semua Sales Manager
 * - Jika ≤ threshold:
 *   → status = DISETUJUI, unit langsung berubah ke BOOKED
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createBookingSchema } from "@/lib/validations/booking";
import { getDiskonThreshold } from "@/app/api/settings/diskon-threshold/route";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canCreateBooking, canViewBooking } from "@/lib/auth/permissions";
import { createNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// GET /api/bookings
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    const statusFilter = req.nextUrl.searchParams.get("status");
    const page  = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 20));

    const where: Record<string, unknown> = {};

    // Sales hanya bisa lihat booking miliknya
    if (user.role === "SALES") {
      where.salesId = user.id;
    }
    if (statusFilter) where.status = statusFilter;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true, status: true, skemaPembayaran: true,
          hargaNormal: true, hargaDeal: true, diskonPersen: true,
          bookingFee: true, createdAt: true,
          lead:  { select: { id: true, nama: true, noHp: true } },
          unit:  { select: { id: true, blok: true, noKavling: true, tipe: true, cluster: { select: { namaCluster: true } } } },
          sales: { select: { id: true, nama: true } },
          approver: { select: { id: true, nama: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return apiSuccess({
      bookings: bookings.map((b) => ({
        ...b,
        hargaNormal: b.hargaNormal.toString(),
        hargaDeal:   b.hargaDeal.toString(),
        bookingFee:  b.bookingFee?.toString() ?? null,
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/bookings]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/bookings
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canCreateBooking(user)) {
      return apiForbidden("Role Anda tidak bisa membuat booking");
    }

    const body = await req.json();
    const data = createBookingSchema.parse(body);

    // Validasi lead
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      select: { id: true, nama: true, salesPicId: true, statusPipeline: true },
    });
    if (!lead) return apiNotFound("Lead tidak ditemukan");

    // Sales hanya bisa booking untuk lead miliknya
    if (user.role === "SALES" && lead.salesPicId !== user.id) {
      return apiForbidden("Anda hanya bisa buat booking untuk lead milik Anda");
    }

    // Validasi unit
    const unit = await prisma.unit.findUnique({
      where: { id: data.unitId },
      select: { id: true, status: true, blok: true, noKavling: true, harga: true },
    });
    if (!unit) return apiNotFound("Unit tidak ditemukan");
    if (unit.status === "BOOKED" || unit.status === "TERJUAL") {
      return apiError(`Unit Blok ${unit.blok}-${unit.noKavling} sudah ${unit.status.toLowerCase()} dan tidak bisa di-booking`, 409);
    }

    // Cek booking aktif untuk unit ini
    const existingBooking = await prisma.booking.findFirst({
      where: {
        unitId: data.unitId,
        status: { notIn: ["DITOLAK", "DIBATALKAN"] },
      },
    });
    if (existingBooking) {
      return apiError("Unit ini sudah memiliki booking aktif", 409);
    }

    // -----------------------------------------------------------------------
    // Hitung diskon & tentukan status booking
    // -----------------------------------------------------------------------
    const diskonPersen = data.diskonPersen > 0
      ? data.diskonPersen
      : Math.max(0, ((data.hargaNormal - data.hargaDeal) / data.hargaNormal) * 100);

    const threshold     = getDiskonThreshold();
    const butuhApproval = diskonPersen > threshold;

    const statusBooking = butuhApproval ? "MENUNGGU_APPROVAL" : "DISETUJUI";

    // -----------------------------------------------------------------------
    // Buat booking + update unit dalam transaksi
    // -----------------------------------------------------------------------
    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          leadId:           data.leadId,
          unitId:           data.unitId,
          salesId:          user.id,
          hargaNormal:      BigInt(Math.round(data.hargaNormal)),
          hargaDeal:        BigInt(Math.round(data.hargaDeal)),
          diskonPersen,
          alasanDiskon:     data.alasanDiskon ?? null,
          skemaPembayaran:  data.skemaPembayaran,
          bookingFee:       data.bookingFee ? BigInt(Math.round(data.bookingFee)) : null,
          targetPelunasanDp: data.targetPelunasanDp ? new Date(data.targetPelunasanDp) : null,
          status:           statusBooking as never,
          // Jika langsung disetujui, set approvedAt
          approvedAt:       statusBooking === "DISETUJUI" ? new Date() : null,
        },
        select: {
          id: true, status: true, diskonPersen: true,
          hargaNormal: true, hargaDeal: true, skemaPembayaran: true,
          lead:  { select: { id: true, nama: true } },
          unit:  { select: { id: true, blok: true, noKavling: true } },
          sales: { select: { id: true, nama: true } },
        },
      }),

      // Jika langsung disetujui → unit jadi BOOKED, lepas hold lead
      ...(statusBooking === "DISETUJUI" ? [
        prisma.unit.update({
          where: { id: data.unitId },
          data:  { status: "BOOKED" },
        }),
        prisma.lead.update({
          where: { id: data.leadId },
          data:  { holdUnitId: null, holdExpiredAt: null, statusPipeline: "BOOKING" },
        }),
      ] : [
        // Saat menunggu approval, tetap update status lead ke NEGOSIASI
        prisma.lead.update({
          where: { id: data.leadId },
          data:  { statusPipeline: "NEGOSIASI" },
        }),
      ]),
    ]);

    // -----------------------------------------------------------------------
    // Kirim notifikasi
    // -----------------------------------------------------------------------
    if (butuhApproval) {
      // Notif ke semua Manager & Super Admin
      const managers = await prisma.user.findMany({
        where: { role: { in: ["MANAGER", "SUPER_ADMIN"] }, statusAktif: true },
        select: { id: true },
      });
      await Promise.allSettled(
        managers.map((m) =>
          createNotification({
            userId:  m.id,
            jenis:   "BOOKING_MENUNGGU_APPROVAL",
            pesan:   `Booking unit Blok ${unit.blok}-${unit.noKavling} oleh ${lead.nama} menunggu persetujuan Anda (diskon ${diskonPersen.toFixed(1)}%)`,
            linkRef: `/bookings/${booking.id}`,
            refId:   booking.id,
          })
        )
      );
    } else {
      // Notif ke Admin bahwa booking disetujui otomatis
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, statusAktif: true },
        select: { id: true },
      });
      await Promise.allSettled(
        admins.map((a) =>
          createNotification({
            userId:  a.id,
            jenis:   "BOOKING_DISETUJUI",
            pesan:   `Booking baru siap diproses: ${lead.nama} — Unit Blok ${unit.blok}-${unit.noKavling}`,
            linkRef: `/bookings/${booking.id}`,
            refId:   booking.id,
          })
        )
      );
    }

    return apiSuccess({
      booking: {
        ...booking,
        hargaNormal: booking.hargaNormal.toString(),
        hargaDeal:   booking.hargaDeal.toString(),
      },
      butuhApproval,
      diskonPersen,
      threshold,
    }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/bookings]", err);
    return apiServerError();
  }
}
