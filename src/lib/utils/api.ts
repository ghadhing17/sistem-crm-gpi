/**
 * Helper untuk API routes — standarisasi response dan error handling
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function apiValidationError(error: ZodError) {
  const errors = error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return NextResponse.json(
    { error: "Validasi gagal", errors },
    { status: 422 }
  );
}

export function apiUnauthorized(message = "Tidak terautentikasi") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function apiForbidden(message = "Tidak memiliki akses") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function apiNotFound(message = "Data tidak ditemukan") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function apiServerError(message = "Terjadi kesalahan server") {
  // Jangan expose detail error ke client
  console.error("[API Error]", message);
  return NextResponse.json(
    { error: "Terjadi kesalahan server. Silakan coba lagi." },
    { status: 500 }
  );
}
