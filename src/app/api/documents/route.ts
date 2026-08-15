/**
 * GET /api/documents          — daftar dokumen per lead atau booking
 * POST /api/documents         — upload dokumen baru (multipart/form-data)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  validateFile, saveFile,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/utils/upload";
import {
  apiSuccess, apiError, apiUnauthorized, apiForbidden,
  apiNotFound, apiServerError,
} from "@/lib/utils/api";
import { canUploadDocument, canViewLead, canViewBooking } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// Kategori dokumen yang tersedia — sesuai PRD 5.7 & checklist 5.6
export const JENIS_DOKUMEN_OPTIONS = [
  "KTP",
  "KK",
  "NPWP",
  "SlipGaji",
  "SuratNikah",
  "SPR",
  "AkadKredit",
  "Lainnya",
] as const;

// ---------------------------------------------------------------------------
// GET /api/documents?leadId=...  atau  ?bookingId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user      = { id: session.user.id, role: session.user.role as UserRole };
    const leadId    = req.nextUrl.searchParams.get("leadId");
    const bookingId = req.nextUrl.searchParams.get("bookingId");

    if (!leadId && !bookingId) {
      return apiError("Parameter leadId atau bookingId wajib diisi");
    }

    // Cek akses ke lead atau booking
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, salesPicId: true },
      });
      if (!lead) return apiNotFound("Lead tidak ditemukan");
      if (!canViewLead(user, { salesPicId: lead.salesPicId })) {
        return apiForbidden("Anda tidak punya akses ke dokumen lead ini");
      }
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, salesId: true },
      });
      if (!booking) return apiNotFound("Booking tidak ditemukan");
      if (!canViewBooking(user, { salesId: booking.salesId })) {
        return apiForbidden("Anda tidak punya akses ke dokumen booking ini");
      }
    }

    const documents = await prisma.document.findMany({
      where: {
        ...(leadId    && { leadId }),
        ...(bookingId && { bookingId }),
      },
      select: {
        id: true, jenisDokumen: true, namaFile: true,
        ukuranBytes: true, mimeType: true, uploadedAt: true, fileUrl: true,
        uploader: { select: { id: true, nama: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return apiSuccess({ documents });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    return apiServerError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/documents — upload file
// Menggunakan FormData (multipart/form-data)
// Fields: file (File), jenisDokumen (string), leadId? (string), bookingId? (string)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };

    if (!canUploadDocument(user)) {
      return apiForbidden("Role Anda tidak bisa mengupload dokumen");
    }

    // Parse FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return apiError("Request harus berformat multipart/form-data");
    }

    const file          = formData.get("file") as File | null;
    const jenisDokumen  = formData.get("jenisDokumen") as string | null;
    const leadId        = formData.get("leadId") as string | null;
    const bookingId     = formData.get("bookingId") as string | null;

    if (!file)         return apiError("File wajib disertakan");
    if (!jenisDokumen) return apiError("Jenis dokumen wajib diisi");
    if (!leadId && !bookingId) return apiError("leadId atau bookingId wajib diisi");

    // Validasi jenis dokumen
    if (!JENIS_DOKUMEN_OPTIONS.includes(jenisDokumen as typeof JENIS_DOKUMEN_OPTIONS[number])) {
      return apiError(`Jenis dokumen tidak valid. Pilihan: ${JENIS_DOKUMEN_OPTIONS.join(", ")}`);
    }

    // Validasi file
    const validation = validateFile(file.name, file.type, file.size);
    if (!validation.valid) {
      return apiError(validation.error ?? "File tidak valid", 422);
    }

    // Cek akses ke lead/booking
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, salesPicId: true },
      });
      if (!lead) return apiNotFound("Lead tidak ditemukan");
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, salesId: true },
      });
      if (!booking) return apiNotFound("Booking tidak ditemukan");
    }

    // Baca buffer dari file
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Simpan ke disk
    const saved = await saveFile(buffer, file.name, file.type, {
      leadId:    leadId ?? undefined,
      bookingId: bookingId ?? undefined,
    });

    // Simpan record ke DB
    const document = await prisma.document.create({
      data: {
        leadId:       leadId    ?? null,
        bookingId:    bookingId ?? null,
        jenisDokumen,
        fileUrl:      saved.fileUrl,
        namaFile:     saved.namaFile,
        ukuranBytes:  saved.ukuranBytes,
        mimeType:     saved.mimeType,
        uploadedBy:   user.id,
      },
      select: {
        id: true, jenisDokumen: true, namaFile: true,
        ukuranBytes: true, mimeType: true, uploadedAt: true, fileUrl: true,
        uploader: { select: { id: true, nama: true } },
      },
    });

    return apiSuccess({ document }, 201);
  } catch (err) {
    console.error("[POST /api/documents]", err);
    return apiServerError();
  }
}
