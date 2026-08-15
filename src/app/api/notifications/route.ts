/**
 * GET  /api/notifications          — daftar notifikasi user yang login
 * POST /api/notifications/:id/read — tandai satu notifikasi sebagai dibaca
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
} from "@/lib/utils/api";

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const limit  = Number(req.nextUrl.searchParams.get("limit") ?? "30");
    const onlyUnread = req.nextUrl.searchParams.get("unread") === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(onlyUnread && { isRead: false }),
      },
      select: {
        id:        true,
        jenis:     true,
        pesan:     true,
        isRead:    true,
        linkRef:   true,
        refId:     true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
    });

    return apiSuccess({ notifications });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications — tandai notifikasi tertentu sebagai dibaca
// Body: { id: string } atau { ids: string[] } atau { all: true }
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const body = await req.json() as { id?: string; ids?: string[]; all?: boolean };

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data:  { isRead: true },
      });
    } else if (body.ids?.length) {
      await prisma.notification.updateMany({
        where: {
          id:     { in: body.ids },
          userId: session.user.id, // pastikan hanya milik user sendiri
        },
        data: { isRead: true },
      });
    } else if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: session.user.id },
        data:  { isRead: true },
      });
    }

    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return apiServerError();
  }
}
