/**
 * GET    /api/units/[id]  — detail unit
 * PATCH  /api/units/[id]  — update unit (Admin BO)
 * DELETE /api/units/[id]  — hapus unit (Admin BO, hanya jika tidak ada booking aktif)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { updateUnitSchema } from "@/lib/validations/unit";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

// Helper: serialisasi BigInt di unit
function serializeUnit(unit: { harga: bigint; [key: string]: unknown }) {
  return { ...unit, harga: unit.harga.toString() };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const unit = await prisma.unit.findUnique({
      where: { id },
      select: {
        id: true, blok: true, noKavling: true, tipe: true,
        luasTanah: true, luasBangunan: true, harga: true,
        status: true, deskripsi: true, createdAt: true, updatedAt: true,
        cluster: { select: { id: true, namaCluster: true, lokasi: true } },
        bookings: {
          where: { status: { notIn: ["DITOLAK", "DIBATALKAN"] } },
          select: {
            id: true, status: true, createdAt: true,
            lead: { select: { id: true, nama: true, noHp: true } },
            sales: { select: { id: true, nama: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!unit) return apiNotFound("Unit tidak ditemukan");
    return apiSuccess({ unit: serializeUnit(unit) });
  } catch (err) {
    console.error("[GET /api/units/[id]]", err);
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
    if (!canManageInventory(user)) return apiForbidden("Tidak punya izin mengedit unit");

    const { id } = await params;
    const existing = await prisma.unit.findUnique({
      where: { id },
      select: { id: true, clusterId: true, blok: true, noKavling: true },
    });
    if (!existing) return apiNotFound("Unit tidak ditemukan");

    const body = await req.json();
    const data = updateUnitSchema.parse(body);

    // Cek duplikat jika blok/kavling diubah
    if (data.blok || data.noKavling) {
      const newBlok     = data.blok     ?? existing.blok;
      const newKavling  = data.noKavling ?? existing.noKavling;
      const duplicate = await prisma.unit.findFirst({
        where: {
          clusterId: existing.clusterId,
          blok:      newBlok,
          noKavling: newKavling,
          NOT: { id },
        },
      });
      if (duplicate) {
        return apiError(`Unit Blok ${newBlok}-${newKavling} sudah ada di cluster ini`, 409);
      }
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...data,
        harga: data.harga ? BigInt(Math.round(data.harga)) : undefined,
      },
      select: {
        id: true, blok: true, noKavling: true, tipe: true,
        luasTanah: true, luasBangunan: true, harga: true, status: true,
        cluster: { select: { id: true, namaCluster: true } },
      },
    });

    return apiSuccess({ unit: serializeUnit(unit) });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/units/[id]]", err);
    return apiServerError();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canManageInventory(user)) return apiForbidden("Tidak punya izin menghapus unit");

    const { id } = await params;
    const unit = await prisma.unit.findUnique({
      where: { id },
      select: {
        id: true, status: true,
        _count: { select: { bookings: true } },
      },
    });
    if (!unit) return apiNotFound("Unit tidak ditemukan");

    // Tidak bisa hapus unit yang punya booking aktif
    const activeBookings = await prisma.booking.count({
      where: { unitId: id, status: { notIn: ["DITOLAK", "DIBATALKAN"] } },
    });
    if (activeBookings > 0) {
      return apiError("Unit tidak bisa dihapus karena masih memiliki booking aktif", 409);
    }

    await prisma.unit.delete({ where: { id } });
    return apiSuccess({ message: "Unit berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/units/[id]]", err);
    return apiServerError();
  }
}
