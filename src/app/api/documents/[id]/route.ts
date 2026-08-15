/**
 * GET    /api/documents/[id]       — metadata dokumen
 * PATCH  /api/documents/[id]       — update jenis dokumen
 * DELETE /api/documents/[id]       — hapus dokumen
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/utils/upload";
import { z } from "zod";
import {
  apiSuccess, apiValidationError, apiUnauthorized,
  apiForbidden, apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canDeleteDocument } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import { ZodError } from "zod";

const JENIS_DOKUMEN_OPTIONS = [
  "KTP", "KK", "NPWP", "SlipGaji", "SuratNikah",
  "SPR", "AkadKredit", "Lainnya",
] as const;

const updateDocSchema = z.object({
  jenisDokumen: z.enum(JENIS_DOKUMEN_OPTIONS, {
    errorMap: () => ({ message: "Jenis dokumen tidak valid" }),
  }),
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PATCH — update jenis dokumen
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, uploadedBy: true },
    });
    if (!doc) return apiNotFound("Dokumen tidak ditemukan");

    // Hanya uploader atau Admin/Super Admin yang bisa update
    const canEdit =
      doc.uploadedBy === user.id ||
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN";
    if (!canEdit) return apiForbidden("Anda tidak punya izin mengubah dokumen ini");

    const body = await req.json();
    const { jenisDokumen } = updateDocSchema.parse(body);

    const updated = await prisma.document.update({
      where: { id },
      data:  { jenisDokumen },
      select: {
        id: true, jenisDokumen: true, namaFile: true,
        ukuranBytes: true, mimeType: true, uploadedAt: true,
        uploader: { select: { id: true, nama: true } },
      },
    });

    return apiSuccess({ document: updated });
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    console.error("[PATCH /api/documents/[id]]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
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

    deleteFile(doc.fileUrl);
    await prisma.document.delete({ where: { id } });

    return apiSuccess({ message: "Dokumen berhasil dihapus" });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]]", err);
    return apiServerError();
  }
}
