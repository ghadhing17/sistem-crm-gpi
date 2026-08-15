/**
 * GET /api/notifications/count — unread count untuk badge bell icon
 * Endpoint ringan, dipoll setiap 30 detik oleh NotifikasiBell
 */

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const count = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });

    return apiSuccess({ count });
  } catch (err) {
    console.error("[GET /api/notifications/count]", err);
    return apiServerError();
  }
}
