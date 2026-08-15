/**
 * Helper createNotification — dipakai di seluruh aplikasi untuk buat notifikasi
 * Centralized agar konsisten dan mudah di-extend (misal tambah email/WA di fase lanjutan)
 */

import { prisma } from "@/lib/db/prisma";
import type { JenisNotifikasi } from "@prisma/client";

interface CreateNotifParams {
  userId: string;
  jenis: JenisNotifikasi;
  pesan: string;
  linkRef?: string;
  refId?: string;
}

/**
 * Buat satu notifikasi in-app.
 * Fire-and-forget aman — tidak perlu await di caller jika tidak kritis.
 */
export async function createNotification(params: CreateNotifParams) {
  return prisma.notification.create({
    data: {
      userId:   params.userId,
      jenis:    params.jenis,
      pesan:    params.pesan,
      linkRef:  params.linkRef ?? null,
      refId:    params.refId ?? null,
      isRead:   false,
    },
  });
}

/**
 * Buat notifikasi LEAD_DIASSIGN untuk sales yang baru di-assign lead.
 * Dipanggil dari POST /api/leads saat salesPicId diset.
 */
export async function notifLeadDiassign(params: {
  salesId:   string;
  leadId:    string;
  leadNama:  string;
}) {
  return createNotification({
    userId:  params.salesId,
    jenis:   "LEAD_DIASSIGN",
    pesan:   `Lead baru ditugaskan ke Anda: ${params.leadNama}`,
    linkRef: `/leads/${params.leadId}`,
    refId:   params.leadId,
  });
}

/**
 * Buat notifikasi REMINDER_FOLLOWUP untuk sales saat reminder jatuh tempo.
 * Dipanggil dari cron job /api/cron/reminders.
 */
export async function notifReminderFollowup(params: {
  salesId:   string;
  leadId:    string;
  leadNama:  string;
  activityId: string;
}) {
  return createNotification({
    userId:  params.salesId,
    jenis:   "REMINDER_FOLLOWUP",
    pesan:   `Pengingat follow-up untuk lead: ${params.leadNama}`,
    linkRef: `/leads/${params.leadId}`,
    refId:   params.activityId,
  });
}
