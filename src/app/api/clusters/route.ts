/**
 * GET /api/clusters          — daftar semua cluster (dengan stats unit)
 * POST /api/clusters         — buat cluster baru (Admin BO / Super Admin)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createClusterSchema } from "@/lib/validations/unit";
import {
  apiSuccess, apiValidationError,
  apiUnauthorized, apiForbidden, apiServerError,
} from "@/lib/utils/api";
import { canManageInventory } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    // Semua role bisa lihat daftar cluster
    const clusters = await prisma.cluster.findMany({
      select: {
        id: true, namaCluster: true, lokasi: true, deskripsi: true, createdAt: true,
        _count: { select: { units: true } },
        units: {
          select: { status: true },
        },
      },
      orderBy: { namaCluster: "asc" },
    });

    // Hitung stats per status untuk tiap cluster
    const result = clusters.map((c) => {
      const stats = {
        TERSEDIA:    0,
        NEGOSIASI:   0,
        BOOKED:      0,
        TERJUAL:     0,
        TIDAK_DIJUAL:0,
        total:       c._count.units,
      };
      for (const u of c.units) {
        stats[u.status as keyof typeof stats] =
          (stats[u.status as keyof typeof stats] as number) + 1;
      }
      return {
        id: c.id, namaCluster: c.namaCluster, lokasi: c.lokasi,
        deskripsi: c.deskripsi, createdAt: c.createdAt,
        stats,
      };
    });

    return apiSuccess({ clusters: result });
  } catch (err) {
    console.error("[GET /api/clusters]", err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (!canManageInventory(user)) {
      return apiForbidden("Hanya Admin Back Office atau Super Admin yang bisa mengelola cluster");
    }

    const body = await req.json();
    const data = createClusterSchema.parse(body);

    const cluster = await prisma.cluster.create({
      data,
      select: { id: true, namaCluster: true, lokasi: true, deskripsi: true, createdAt: true },
    });

    return apiSuccess({ cluster }, 201);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[POST /api/clusters]", err);
    return apiServerError();
  }
}
