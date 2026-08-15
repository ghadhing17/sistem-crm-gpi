/**
 * POST /api/units/[id]/hold  — request hold sementara unit ke lead tertentu
 * DELETE /api/units/[id]/hold — lepas hold manual
 *
 * PRD 6.2 langkah 3 & 6.6:
 * - Hold mengubah status unit → NEGOSIASI, terkait ke lead
 * - holdExpiredAt dihitung dari sekarang + durasiJam (default 24)
 * - Jika unit sudah di-hold sales lain → return 409 dengan info sales + expiry
 * - DELETE: lepas hold, kembalikan unit → TERSEDIA, hapus holdUnitId dari lead
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canRequestUnitHold } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const DEFAULT_HOLD_JAM = 24;
const MAX_HOLD_JAM     = 72;

const holdSchema = z.object({
  leadId:     z.string().cuid("ID lead tidak valid"),
  durasiJam:  z.coerce.number().int().min(1).max(MAX_HOLD_JAM).default(DEFAULT_HOLD_JAM),
});

// ---------------------------------------------------------------------------
// POST — request hold
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canRequestUnitHold(user)) {
      return apiForbidden("Role Anda tidak bisa melakukan hold unit");
    }

    const { id: unitId } = await params;
    const body = await req.json();
    const { leadId, durasiJam } = holdSchema.parse(body);

    // -----------------------------------------------------------------------
    // Cek unit ada
    // -----------------------------------------------------------------------
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, status: true, blok: true, noKavling: true },
    });
    if (!unit) return apiNotFound("Unit tidak ditemukan");

    // -----------------------------------------------------------------------
    // Cek apakah unit sudah di-hold lead lain (edge case PRD 6.6)
    // -----------------------------------------------------------------------
    if (unit.status === "NEGOSIASI") {
      const leadYangMegang = await prisma.lead.findFirst({
        where: {
          holdUnitId:  unitId,
          holdExpiredAt: { gt: new Date() }, // masih aktif
        },
        select: {
          id:           true,
          holdExpiredAt: true,
          salesPic:     { select: { id: true, nama: true } },
        },
      });

      if (leadYangMegang && leadYangMegang.salesPic?.id !== user.id) {
        // Hitung waktu berakhir hold
        const expiredAt = leadYangMegang.holdExpiredAt!;
        const waktuBerakhir = format(expiredAt, "d MMM yyyy, HH:mm", { locale: localeId });

        return apiError(
          `Unit ini sedang dalam negosiasi oleh ${leadYangMegang.salesPic!.nama}, hold otomatis berakhir ${waktuBerakhir}`,
          409
        );
      }
    }

    // -----------------------------------------------------------------------
    // Cek unit sudah di-booking atau terjual — tidak bisa di-hold
    // -----------------------------------------------------------------------
    if (unit.status === "BOOKED" || unit.status === "TERJUAL" || unit.status === "TIDAK_DIJUAL") {
      return apiError(
        `Unit dengan status "${unit.status}" tidak bisa di-hold`,
        409
      );
    }

    // -----------------------------------------------------------------------
    // Cek lead ada dan user berhak
    // -----------------------------------------------------------------------
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, salesPicId: true, nama: true },
    });
    if (!lead) return apiNotFound("Lead tidak ditemukan");

    // Sales hanya bisa hold untuk lead miliknya
    if (user.role === "SALES" && lead.salesPicId !== user.id) {
      return apiForbidden("Anda hanya bisa hold unit untuk lead milik Anda");
    }

    // -----------------------------------------------------------------------
    // Lepas hold lama lead ini jika ada (lead pindah ke unit lain)
    // -----------------------------------------------------------------------
    if (lead) {
      const leadLama = await prisma.lead.findFirst({
        where: { holdUnitId: { not: null }, id: leadId },
        select: { id: true, holdUnitId: true },
      });
      if (leadLama?.holdUnitId && leadLama.holdUnitId !== unitId) {
        // Kembalikan unit lama ke TERSEDIA
        await prisma.unit.update({
          where: { id: leadLama.holdUnitId },
          data:  { status: "TERSEDIA" },
        });
      }
    }

    const expiredAt = new Date(Date.now() + durasiJam * 60 * 60 * 1000);

    // -----------------------------------------------------------------------
    // Update unit + lead dalam satu transaksi
    // -----------------------------------------------------------------------
    const [updatedUnit, updatedLead] = await prisma.$transaction([
      prisma.unit.update({
        where: { id: unitId },
        data:  { status: "NEGOSIASI" },
        select: { id: true, blok: true, noKavling: true, status: true },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          holdUnitId:   unitId,
          holdExpiredAt: expiredAt,
        },
        select: { id: true, nama: true, holdExpiredAt: true },
      }),
    ]);

    return apiSuccess({
      unit:  updatedUnit,
      lead:  updatedLead,
      holdExpiredAt: expiredAt.toISOString(),
      waktuBerakhir: format(expiredAt, "d MMM yyyy, HH:mm", { locale: localeId }),
      durasiJam,
    });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/units/[id]/hold]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// DELETE — lepas hold manual
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canRequestUnitHold(user)) {
      return apiForbidden("Role Anda tidak bisa melepas hold unit");
    }

    const { id: unitId } = await params;

    // Cari lead yang memegang hold ini
    const leadYangMegang = await prisma.lead.findFirst({
      where: { holdUnitId: unitId },
      select: { id: true, salesPicId: true },
    });

    // Sales hanya bisa lepas hold lead miliknya
    if (
      leadYangMegang &&
      user.role === "SALES" &&
      leadYangMegang.salesPicId !== user.id
    ) {
      return apiForbidden("Anda hanya bisa melepas hold untuk lead milik Anda");
    }

    // Kembalikan unit ke TERSEDIA + hapus hold dari lead
    await prisma.$transaction([
      prisma.unit.update({
        where: { id: unitId },
        data:  { status: "TERSEDIA" },
      }),
      ...(leadYangMegang ? [
        prisma.lead.update({
          where: { id: leadYangMegang.id },
          data:  { holdUnitId: null, holdExpiredAt: null },
        }),
      ] : []),
    ]);

    return apiSuccess({ message: "Hold berhasil dilepas, unit kembali ke status Tersedia" });
  } catch (err) {
    console.error("[DELETE /api/units/[id]/hold]", err);
    return apiServerError();
  }
}
