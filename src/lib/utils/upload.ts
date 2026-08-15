/**
 * Helper file storage untuk modul dokumen — CRM Graha Padma
 *
 * File disimpan di folder privat di luar direktori publik Next.js.
 * Path default: <project_root>/uploads/ (dikonfigurasi via env UPLOAD_DIR)
 *
 * Struktur folder:
 *   uploads/
 *     leads/[leadId]/[timestamp]-[filename]
 *     bookings/[bookingId]/[timestamp]-[filename]
 *
 * Fase 3 (Keamanan): tambahkan signed URL + enkripsi at-rest.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB ?? "5");
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Folder root upload — di luar direktori publik Next.js */
export function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Tipe MIME yang diizinkan — whitelist sesuai PRD 10.6
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

// ---------------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------------

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  filename: string,
  mimeType: string,
  sizeBytes: number
): FileValidationResult {
  // Cek ekstensi
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Format tidak didukung. Gunakan: PDF, JPG, PNG (ekstensi: ${ext})`,
    };
  }

  // Cek MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Tipe file tidak valid (${mimeType}). Hanya PDF dan gambar (JPG/PNG) yang diizinkan.`,
    };
  }

  // Cek ukuran
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran file (${sizeMb} MB) melebihi batas ${MAX_FILE_SIZE_MB} MB.`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export interface SaveFileResult {
  fileUrl: string;   // relative path dari uploadDir, disimpan ke DB
  namaFile: string;  // nama file asli
  ukuranBytes: number;
  mimeType: string;
}

/**
 * Simpan file ke disk.
 * fileUrl yang dikembalikan adalah path relatif dari uploadDir — disimpan ke DB,
 * bukan path absolut, agar portabel antar environment.
 */
export async function saveFile(
  fileData: Buffer,
  originalFilename: string,
  mimeType: string,
  context: { leadId?: string; bookingId?: string }
): Promise<SaveFileResult> {
  const uploadDir = getUploadDir();
  const timestamp = Date.now();
  const safeName  = sanitizeFilename(originalFilename);
  const filename  = `${timestamp}-${safeName}`;

  // Tentukan subfolder berdasarkan context
  let subDir: string;
  if (context.bookingId) {
    subDir = path.join("bookings", context.bookingId);
  } else if (context.leadId) {
    subDir = path.join("leads", context.leadId);
  } else {
    subDir = "misc";
  }

  const fullSubDir = path.join(uploadDir, subDir);
  if (!fs.existsSync(fullSubDir)) {
    fs.mkdirSync(fullSubDir, { recursive: true });
  }

  const absolutePath = path.join(fullSubDir, filename);
  fs.writeFileSync(absolutePath, fileData);

  // fileUrl = path relatif dari uploadDir (tanpa leading slash)
  const fileUrl = path.join(subDir, filename).replace(/\\/g, "/");

  return {
    fileUrl,
    namaFile:    originalFilename,
    ukuranBytes: fileData.length,
    mimeType,
  };
}

/**
 * Baca file dari disk.
 * fileUrl adalah path relatif dari uploadDir (dari DB).
 */
export function readFile(fileUrl: string): Buffer {
  const uploadDir = getUploadDir();
  const absolutePath = path.join(uploadDir, fileUrl);
  // Cegah path traversal attack
  if (!absolutePath.startsWith(uploadDir)) {
    throw new Error("Path tidak valid");
  }
  return fs.readFileSync(absolutePath);
}

/**
 * Hapus file dari disk.
 */
export function deleteFile(fileUrl: string): void {
  try {
    const uploadDir = getUploadDir();
    const absolutePath = path.join(uploadDir, fileUrl);
    if (!absolutePath.startsWith(uploadDir)) {
      throw new Error("Path tidak valid");
    }
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    // Log tapi jangan fail — file mungkin sudah tidak ada
    console.warn("[upload] Gagal hapus file:", fileUrl);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sanitizeFilename(filename: string): string {
  // Hapus karakter berbahaya, pertahankan huruf, angka, titik, dash, underscore
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100); // batas 100 karakter
}

/** Tentukan Content-Type dari ekstensi file */
export function getContentType(fileUrl: string): string {
  const ext = path.extname(fileUrl).toLowerCase();
  const map: Record<string, string> = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}
