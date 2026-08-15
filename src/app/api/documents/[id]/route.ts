/**
 * GET    /api/documents/[id]       — metadata dokumen
 * DELETE /api/documents/[id]       — hapus dokumen
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/utils/upload";
import {
  apiSuccess, apiUnauthorized, apiForbidden,
  apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canDeleteDocument } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true, jenisDokumen: true, namaFile: true,
        ukuranBytes: true, mimeType: true, uploadedAt: true,
        uploader: { select: { id: true, nama: true } },
        leadId: true, bookingId: true,
      },
    });

    if (!doc) return apiNotFound("Dokumen tidak ditemukan");
    return apiSuccess({ document: doc });
  } catch (err) {
    console.error("[GET /api/documents/[id]]", err);
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
    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, fileUrl: true, uploadedBy: true },
    });

    if (!doc) return apiNotFound("Dokumen tidak ditemukan");

    if (!canDeleteDocument(user, { uploadedBy: doc.uploadedBy })) {
      return apiForbidden("Anda tidak punya izin menghapus dokumen ini");
    }

    // Hapus file dari disk lalu dari DB
    deleteFile(doc.fileUrl);
    await prisma.document.delete({ where: { id } });

    return apiSuccess({ message: "Dokumen berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]]", err);
    return apiServerError();
  }
}
