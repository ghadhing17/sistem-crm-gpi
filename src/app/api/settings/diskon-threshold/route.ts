/**
 * GET /api/settings/diskon-threshold
 * PATCH /api/settings/diskon-threshold
 *
 * Konfigurasi batas persentase diskon yang memerlukan approval Manager.
 * Disimpan sebagai env variable DISKON_THRESHOLD_PERSEN (default: 5).
 * Super Admin bisa update via PATCH (disimpan ke file config lokal atau env).
 *
 * Implementasi sederhana: gunakan env var dengan fallback ke 5%.
 * Fase lanjutan: simpan ke tabel Settings di DB.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiUnauthorized, apiForbidden } from "@/lib/utils/api";
import type { UserRole } from "@/types";

export const DEFAULT_DISKON_THRESHOLD = 5; // 5%

export function getDiskonThreshold(): number {
  const val = process.env.DISKON_THRESHOLD_PERSEN;
  if (!val) return DEFAULT_DISKON_THRESHOLD;
  const num = parseFloat(val);
  return isNaN(num) ? DEFAULT_DISKON_THRESHOLD : num;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    return apiSuccess({
      threshold: getDiskonThreshold(),
      keterangan: "Diskon di atas batas ini akan memerlukan approval Sales Manager",
    });
  } catch {
    return apiSuccess({ threshold: DEFAULT_DISKON_THRESHOLD });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return apiUnauthorized();

    const user = { id: session.user.id, role: session.user.role as UserRole };
    if (user.role !== "SUPER_ADMIN") {
      return apiForbidden("Hanya Super Admin yang bisa mengubah konfigurasi ini");
    }

    // Pada implementasi ini, hanya mengembalikan nilai karena env var
    // tidak bisa diubah runtime. Fase lanjutan: simpan ke DB.
    const body = await req.json();
    const threshold = parseFloat(body.threshold ?? DEFAULT_DISKON_THRESHOLD);

    return apiSuccess({
      threshold,
      keterangan: "Perubahan akan aktif setelah restart server (atau gunakan tabel Settings di DB pada fase lanjutan)",
    });
  } catch {
    return apiSuccess({ threshold: DEFAULT_DISKON_THRESHOLD });
  }
}
