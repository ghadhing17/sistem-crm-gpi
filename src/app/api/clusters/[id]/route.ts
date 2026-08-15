/**
 * GET    /api/clusters/[id]  — detail cluster
 * PATCH  /api/clusters/[id]  — update cluster (Admin BO)
 * DELETE /api/clusters/[id]  — hapus cluster (Admin BO, hanya jika tidak punya unit)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { updateClusterSchema } from "@/lib/validations/unit";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const cluster = await prisma.cluster.findUnique({
      where: { id },
      select: {
        id: true, namaCluster: true, lokasi: true, deskripsi: true, createdAt: true,
        units: {
          select: {
            id: true, blok: true, noKavling: true, tipe: true,
            luasTanah: true, luasBangunan: true, harga: true, status: true, deskripsi: true,
          },
          orderBy: [{ blok: "asc" }, { noKavling: "asc" }],
        },
      },
    });

    if (!cluster) return apiNotFound("Cluster tidak ditemukan");
    return apiSuccess({ cluster });
  } catch (err) {
    console.error("[GET /api/clusters/[id]]", err);
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
    if (!canManageInventory(user)) return apiForbidden("Tidak punya izin mengedit cluster");

    const { id } = await params;
    const body = await req.json();
    const data = updateClusterSchema.parse(body);

    const existing = await prisma.cluster.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiNotFound("Cluster tidak ditemukan");

    const cluster = await prisma.cluster.update({
      where: { id }, data,
      select: { id: true, namaCluster: true, lokasi: true, deskripsi: true, updatedAt: true },
    });

    return apiSuccess({ cluster });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/clusters/[id]]", err);
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
    if (!canManageInventory(user)) return apiForbidden("Tidak punya izin menghapus cluster");

    const { id } = await params;
    const cluster = await prisma.cluster.findUnique({
      where: { id },
      select: { id: true, _count: { select: { units: true } } },
    });
    if (!cluster) return apiNotFound("Cluster tidak ditemukan");

    if (cluster._count.units > 0) {
      return apiError(
        `Cluster tidak bisa dihapus karena masih memiliki ${cluster._count.units} unit. Hapus semua unit terlebih dahulu.`,
        409
      );
    }

    await prisma.cluster.delete({ where: { id } });
    return apiSuccess({ message: "Cluster berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/clusters/[id]]", err);
    return apiServerError();
  }
}
