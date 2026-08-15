/**
 * GET /api/clusters — daftar cluster untuk dropdown form tambah lead
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const clusters = await prisma.cluster.findMany({
      select: { id: true, namaCluster: true, lokasi: true },
      orderBy: { namaCluster: "asc" },
    });

    return apiSuccess({ clusters });
  } catch (err) {
    console.error("[GET /api/clusters]", err);
    return apiServerError();
  }
}
