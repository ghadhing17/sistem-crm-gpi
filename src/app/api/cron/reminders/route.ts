/**
 * POST /api/cron/reminders — trigger notifikasi reminder follow-up jatuh tempo
 *
 * Endpoint ini dirancang untuk dipanggil oleh cron job eksternal (misal Vercel Cron,
 * GitHub Actions, atau server cron di VPS) setiap 15-30 menit.
 *
 * Keamanan: wajib menyertakan header Authorization: Bearer <CRON_SECRET>
 * Set env variable CRON_SECRET di Vercel/VPS.
 *
 * Logika:
 * - Cari semua Activity yang reminderAt sudah lewat (< now) dan belum dinotifikasi
 * - Untuk tiap activity, buat notifikasi REMINDER_FOLLOWUP ke sales PIC lead-nya
 * - Tandai activity sebagai sudah dinotifikasi (set reminderAt = null agar tidak double-trigger)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { notifReminderFollowup } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  // Validasi CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Cari aktivitas yang reminderAt sudah lewat
    const dueActivities = await prisma.activity.findMany({
      where: {
        reminderAt: { lte: now, not: null },
      },
      select: {
        id: true,
        leadId: true,
        createdBy: true,
        lead: {
          select: {
            id: true,
            nama: true,
            salesPicId: true,
          },
        },
      },
      take: 100, // batch per run
    });

    if (dueActivities.length === 0) {
      return NextResponse.json({ data: { processed: 0 } });
    }

    // Proses setiap reminder
    const results = await Promise.allSettled(
      dueActivities.map(async (activity) => {
        const targetUserId = activity.lead.salesPicId ?? activity.createdBy;

        // Buat notifikasi
        await notifReminderFollowup({
          salesId:    targetUserId,
          leadId:     activity.lead.id,
          leadNama:   activity.lead.nama,
          activityId: activity.id,
        });

        // Reset reminderAt agar tidak trigger lagi
        await prisma.activity.update({
          where: { id: activity.id },
          data:  { reminderAt: null },
        });
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed    = results.filter((r) => r.status === "rejected").length;

    console.log(`[CRON reminders] processed: ${succeeded}, failed: ${failed}`);

    return NextResponse.json({
      data: { processed: succeeded, failed },
    });
  } catch (err) {
    console.error("[POST /api/cron/reminders]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
