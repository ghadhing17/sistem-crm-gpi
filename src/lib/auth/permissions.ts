/**
 * Helper permission RBAC — CRM Graha Padma
 *
 * Semua keputusan akses di-centralize di sini, sesuai matriks PRD Bab 3.1.
 * Dipakai di API routes, Server Actions, dan middleware.
 *
 * Prinsip: cek di backend SELALU — UI hanya menyembunyikan tombol,
 * bukan pengganti otorisasi sesungguhnya (PRD 10.3).
 */

import type { UserRole } from "@/types";
import {
  ROLES_CAN_VIEW_ALL_LEADS,
  ROLES_CAN_APPROVE,
  ROLES_CAN_MANAGE_INVENTORY,
  ROLES_CAN_MANAGE_USERS,
  hasMinimumRole,
} from "./roles";

// ---------------------------------------------------------------------------
// Tipe minimal — cukup field yang dibutuhkan untuk cek permission
// ---------------------------------------------------------------------------

interface SessionUser {
  id: string;
  role: UserRole;
}

interface LeadRecord {
  salesPicId: string | null;
}

interface BookingRecord {
  salesId: string;
}

interface DocumentRecord {
  uploadedBy: string;
}

// ---------------------------------------------------------------------------
// LEAD permissions — PRD 3.1
// ---------------------------------------------------------------------------

/**
 * Bisa input lead baru:
 * Sales Exec ✅ | Sales Manager ✅ | Admin BO ✅ | Management ❌
 */
export function canCreateLead(user: SessionUser): boolean {
  return user.role !== "MANAGEMENT";
}

/**
 * Bisa melihat detail lead:
 * - Sales Exec: hanya lead miliknya (salesPicId === user.id) atau yang belum di-assign
 * - Manager, Admin, Management, Super Admin: semua lead
 */
export function canViewLead(user: SessionUser, lead: LeadRecord): boolean {
  if (ROLES_CAN_VIEW_ALL_LEADS.includes(user.role)) return true;
  // Sales Exec: hanya miliknya atau unassigned
  return lead.salesPicId === user.id || lead.salesPicId === null;
}

/**
 * Bisa lihat SEMUA lead (bukan hanya milik sendiri):
 * Manager ✅ | Admin BO ✅ | Management ✅ | Super Admin ✅ | Sales Exec ❌
 */
export function canViewAllLeads(user: SessionUser): boolean {
  return ROLES_CAN_VIEW_ALL_LEADS.includes(user.role);
}

/**
 * Bisa update status pipeline lead:
 * - Sales Exec: hanya lead miliknya
 * - Sales Manager: semua lead
 * - Admin BO ❌ | Management ❌ (mereka hanya bisa lihat)
 */
export function canUpdateLeadPipeline(
  user: SessionUser,
  lead: LeadRecord
): boolean {
  if (user.role === "SALES_MANAGER" || user.role === "SUPER_ADMIN") return true;
  if (user.role === "SALES_EXECUTIVE") {
    return lead.salesPicId === user.id;
  }
  return false;
}

/**
 * Bisa reassign lead ke sales lain:
 * Manager ✅ | Admin BO ✅ | Super Admin ✅ | Sales Exec ❌ | Management ❌
 */
export function canReassignLead(user: SessionUser): boolean {
  return (
    user.role === "SALES_MANAGER" ||
    user.role === "ADMIN_BACK_OFFICE" ||
    user.role === "SUPER_ADMIN"
  );
}

/**
 * Bisa edit data lead (nama, noHp, sumber, dll):
 * - Sales Exec: hanya lead miliknya
 * - Manager: semua lead
 * - Admin BO: semua lead
 * - Management ❌ (read-only)
 */
export function canEditLead(user: SessionUser, lead: LeadRecord): boolean {
  if (user.role === "MANAGEMENT") return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (
    user.role === "SALES_MANAGER" ||
    user.role === "ADMIN_BACK_OFFICE"
  )
    return true;
  if (user.role === "SALES_EXECUTIVE") {
    return lead.salesPicId === user.id;
  }
  return false;
}

// ---------------------------------------------------------------------------
// BOOKING permissions — PRD 3.1
// ---------------------------------------------------------------------------

/**
 * Bisa ajukan booking:
 * Sales Exec ✅ | Manager ✅ | Admin BO ✅ | Management ❌
 */
export function canCreateBooking(user: SessionUser): boolean {
  return user.role !== "MANAGEMENT";
}

/**
 * Bisa approve/tolak booking:
 * Manager ✅ | Management ✅ (opsional) | Super Admin ✅ | Sales Exec ❌ | Admin BO ❌
 */
export function canApproveBooking(user: SessionUser): boolean {
  return ROLES_CAN_APPROVE.includes(user.role);
}

/**
 * Bisa lihat detail booking:
 * - Sales Exec: hanya booking miliknya
 * - Semua role lain: semua booking
 */
export function canViewBooking(
  user: SessionUser,
  booking: BookingRecord
): boolean {
  if (user.role === "SALES_EXECUTIVE") {
    return booking.salesId === user.id;
  }
  return true;
}

/**
 * Bisa update status KPR/pembayaran:
 * Admin BO ✅ | Super Admin ✅ | Lainnya ❌
 */
export function canUpdatePaymentStatus(user: SessionUser): boolean {
  return (
    user.role === "ADMIN_BACK_OFFICE" || user.role === "SUPER_ADMIN"
  );
}

// ---------------------------------------------------------------------------
// UNIT & INVENTORY permissions — PRD 3.1
// ---------------------------------------------------------------------------

/**
 * Bisa kelola master data unit/cluster (CRUD):
 * Admin BO ✅ | Super Admin ✅ | Lainnya ❌
 */
export function canManageInventory(user: SessionUser): boolean {
  return ROLES_CAN_MANAGE_INVENTORY.includes(user.role);
}

/**
 * Bisa request hold sementara unit (saat negosiasi):
 * Sales Exec ✅ | Manager ✅ | Lainnya ❌
 * (Admin BO kelola unit langsung, tidak perlu hold request)
 */
export function canRequestUnitHold(user: SessionUser): boolean {
  return (
    user.role === "SALES_EXECUTIVE" ||
    user.role === "SALES_MANAGER" ||
    user.role === "SUPER_ADMIN"
  );
}

// ---------------------------------------------------------------------------
// DOKUMEN permissions — PRD 3.1 & 5.7
// ---------------------------------------------------------------------------

/**
 * Bisa upload dokumen:
 * Sales Exec ✅ | Manager ✅ | Admin BO ✅ | Management ❌
 */
export function canUploadDocument(user: SessionUser): boolean {
  return user.role !== "MANAGEMENT";
}

/**
 * Bisa hapus dokumen:
 * - Uploader asli (semua role): dokumen miliknya sendiri
 * - Admin BO dan Super Admin: semua dokumen
 */
export function canDeleteDocument(
  user: SessionUser,
  doc: DocumentRecord
): boolean {
  if (
    user.role === "ADMIN_BACK_OFFICE" ||
    user.role === "SUPER_ADMIN"
  )
    return true;
  return doc.uploadedBy === user.id;
}

// ---------------------------------------------------------------------------
// LAPORAN permissions — PRD 3.1
// ---------------------------------------------------------------------------

/**
 * Bisa export laporan:
 * Semua role ✅ (tapi scope berbeda — diterapkan di query level)
 */
export function canExportReport(user: SessionUser): boolean {
  return true; // semua bisa, scope dikontrol di query
}

/**
 * Bisa lihat dashboard eksekutif (laporan lintas tim):
 * Manager ✅ | Admin BO ✅ | Management ✅ | Super Admin ✅ | Sales Exec ❌
 */
export function canViewExecutiveDashboard(user: SessionUser): boolean {
  return hasMinimumRole(user.role, "SALES_MANAGER");
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT permissions — PRD 3.1
// ---------------------------------------------------------------------------

/**
 * Bisa kelola user & role:
 * Super Admin ✅ saja — sesuai PRD
 */
export function canManageUsers(user: SessionUser): boolean {
  return ROLES_CAN_MANAGE_USERS.includes(user.role);
}

/**
 * Bisa akses halaman Settings:
 * Admin BO ✅ | Manager ✅ | Super Admin ✅ | Management ❌ | Sales Exec ❌
 */
export function canAccessSettings(user: SessionUser): boolean {
  return (
    user.role === "ADMIN_BACK_OFFICE" ||
    user.role === "SALES_MANAGER" ||
    user.role === "SUPER_ADMIN"
  );
}

// ---------------------------------------------------------------------------
// Helper umum — untuk middleware dan API route guard
// ---------------------------------------------------------------------------

/**
 * Mapping route prefix → role minimum yang dibutuhkan.
 * Dipakai di middleware.ts untuk proteksi route secara deklaratif.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "ADMIN_BACK_OFFICE",
    "MANAGEMENT",
    "SUPER_ADMIN",
  ],
  "/leads": [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "ADMIN_BACK_OFFICE",
    "MANAGEMENT",
    "SUPER_ADMIN",
  ],
  "/units": [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "ADMIN_BACK_OFFICE",
    "MANAGEMENT",
    "SUPER_ADMIN",
  ],
  "/bookings": [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "ADMIN_BACK_OFFICE",
    "MANAGEMENT",
    "SUPER_ADMIN",
  ],
  "/reports": [
    "SALES_EXECUTIVE",
    "SALES_MANAGER",
    "ADMIN_BACK_OFFICE",
    "MANAGEMENT",
    "SUPER_ADMIN",
  ],
  "/settings": [
    "ADMIN_BACK_OFFICE",
    "SALES_MANAGER",
    "SUPER_ADMIN",
  ],
  "/settings/users": ["SUPER_ADMIN"],
};

/**
 * Cek apakah user boleh mengakses route tertentu.
 * Dipakai di middleware sebelum render halaman.
 */
export function canAccessRoute(user: SessionUser, pathname: string): boolean {
  // Cari aturan paling spesifik (longest match)
  const matchingRoutes = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true; // route tidak diatur = bebas diakses

  const requiredRoles = ROUTE_PERMISSIONS[matchingRoutes[0]];
  return requiredRoles.includes(user.role);
}
