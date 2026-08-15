/**
 * GET /api/users/sales — daftar user bertipe sales untuk dropdown filter
 * Hanya bisa diakses role yang bisa lihat semua lead (Manager ke atas)
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiUnauthorized, apiForbidden, apiServerError } from "@/lib/utils/api";
import { canViewAllLeads } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    // Hanya role yang bisa lihat semua lead yang perlu filter per sales
    if (!canViewAllLeads(user)) {
      return apiForbidden("Anda tidak punya akses ke daftar sales");
    }

    const salesUsers = await prisma.user.findMany({
      where: {
        statusAktif: true,
        role: { in: ["SALES", "MANAGER"] },
      },
      select: { id: true, nama: true, role: true },
      orderBy: { nama: "asc" },
    });

    return apiSuccess({ users: salesUsers });
  } catch (err) {
    console.error("[GET /api/users/sales]", err);
    return apiServerError();
  }
}
