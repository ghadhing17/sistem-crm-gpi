/**
 * GET  /api/units?clusterId=... — daftar unit per cluster
 * POST /api/units               — buat unit baru (Admin BO)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createUnitSchema } from "@/lib/validations/unit";
import {
  apiSuccess, apiError, apiValidationError,
  apiUnauthorized, apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const clusterId = req.nextUrl.searchParams.get("clusterId");
    const statusFilter = req.nextUrl.searchParams.get("status");

    const units = await prisma.unit.findMany({
      where: {
        ...(clusterId    && { clusterId }),
        ...(statusFilter && { status: statusFilter as never }),
      },
      select: {
        id: true, clusterId: true, blok: true, noKavling: true, tipe: true,
        luasTanah: true, luasBangunan: true, harga: true, status: true, deskripsi: true,
        cluster: { select: { id: true, namaCluster: true } },
      },
      orderBy: [{ blok: "asc" }, { noKavling: "asc" }],
    });

    return apiSuccess({ units });
  } catch (err) {
    console.error("[GET /api/units]", err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canManageInventory(user)) {
      return apiForbidden("Hanya Admin Back Office atau Super Admin yang bisa menambah unit");
    }

    const body = await req.json();
    const data = createUnitSchema.parse(body);

    // Validasi cluster ada
    const cluster = await prisma.cluster.findUnique({
      where: { id: data.clusterId }, select: { id: true },
    });
    if (!cluster) return apiNotFound("Cluster tidak ditemukan");

    // Cek duplikat blok + kavling dalam cluster
    const existing = await prisma.unit.findUnique({
      where: {
        clusterId_blok_noKavling: {
          clusterId: data.clusterId,
          blok:      data.blok,
          noKavling: data.noKavling,
        },
      },
    });
    if (existing) {
      return apiError(`Unit Blok ${data.blok}-${data.noKavling} sudah ada di cluster ini`, 409);
    }

    const unit = await prisma.unit.create({
      data: {
        clusterId:    data.clusterId,
        blok:         data.blok,
        noKavling:    data.noKavling,
        tipe:         data.tipe,
        luasTanah:    data.luasTanah,
        luasBangunan: data.luasBangunan,
        harga:        BigInt(Math.round(data.harga)),
        status:       data.status ?? "TERSEDIA",
        deskripsi:    data.deskripsi ?? null,
      },
      select: {
        id: true, blok: true, noKavling: true, tipe: true,
        luasTanah: true, luasBangunan: true, harga: true, status: true,
        cluster: { select: { id: true, namaCluster: true } },
      },
    });

    // Serialisasi BigInt → string untuk JSON
    return apiSuccess({
      unit: { ...unit, harga: unit.harga.toString() },
    }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/units]", err);
    return apiServerError();
  }
}
