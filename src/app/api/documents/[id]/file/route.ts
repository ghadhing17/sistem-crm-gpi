/**
 * GET /api/documents/[id]/file — serve file untuk preview di browser
 *
 * Membaca file dari disk dan mengirimkan sebagai response binary.
 * Content-Disposition: inline — agar browser bisa preview PDF/gambar langsung.
 *
 * Fase 3 (Keamanan): tambahkan signed URL + token expiry.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { readFile, getContentType } from "@/lib/utils/upload";
import { canViewLead, canViewBooking } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = { id: session.user.id, role: session.user.role as UserRole };
    const { id } = await params;

    // Cari dokumen
    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true, fileUrl: true, namaFile: true, mimeType: true,
        leadId: true, bookingId: true,
        lead:    { select: { salesPicId: true } },
        booking: { select: { salesId: true } },
      },
    });

    if (!doc) {
      return new NextResponse("Dokumen tidak ditemukan", { status: 404 });
    }

    // Cek akses berdasarkan relasi lead/booking
    if (doc.lead && !canViewLead(user, { salesPicId: doc.lead.salesPicId })) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (doc.booking && !canViewBooking(user, { salesId: doc.booking.salesId })) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Baca file dari disk
    let fileBuffer: Buffer;
    try {
      fileBuffer = readFile(doc.fileUrl);
    } catch {
      return new NextResponse("File tidak ditemukan di server", { status: 404 });
    }

    const contentType = doc.mimeType ?? getContentType(doc.fileUrl);
    const filename    = doc.namaFile ?? "document";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type":        contentType,
        "Content-Length":      String(fileBuffer.length),
        // inline = preview di browser, attachment = force download
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        // Cache 1 jam di browser, tapi revalidasi di server
        "Cache-Control":       "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[GET /api/documents/[id]/file]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
