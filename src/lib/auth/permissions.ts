/**
 * Helper permission RBAC — CRM Graha Padma
 *
 * Role baru:
 *   SALES       = Sales (menangani lead & follow-up harian)
 *   MANAGER     = Manager (approve, visibilitas lintas-tim, termasuk fungsi Management/Owner)
 *   ADMIN       = Admin (kelola unit, dokumen, proses transaksi)
 *   SUPER_ADMIN = Full access
 *
 * Logika bisnis tidak berubah — hanya nama role yang diganti.
 */

import type { UserRole } from "@/types";
import {
  ROLES_CAN_VIEW_ALL_LEADS,
  ROLES_CAN_APPROVE,
  ROLES_CAN_MANAGE_INVENTORY,
  ROLES_CAN_MANAGE_USERS,
  hasMinimumRole,
} from "./roles";

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
// LEAD permissions
// ---------------------------------------------------------------------------

/** Sales ✅ | Manager ✅ | Admin ✅ | Super Admin ✅ */
export function canCreateLead(user: SessionUser): boolean {
  return true; // semua role bisa — Manager dulu juga bisa
}

export function canViewLead(user: SessionUser, lead: LeadRecord): boolean {
  if (ROLES_CAN_VIEW_ALL_LEADS.includes(user.role)) return true;
  return lead.salesPicId === user.id || lead.salesPicId === null;
}

/** Manager ✅ | Admin ✅ | Super Admin ✅ | Sales ❌ */
export function canViewAllLeads(user: SessionUser): boolean {
  return ROLES_CAN_VIEW_ALL_LEADS.includes(user.role);
}

/**
 * Sales: hanya lead miliknya | Manager: semua lead
 * Admin ❌ (hanya lihat) | Super Admin ✅
 */
export function canUpdateLeadPipeline(
  user: SessionUser,
  lead: LeadRecord
): boolean {
  if (user.role === "MANAGER" || user.role === "SUPER_ADMIN") return true;
  if (user.role === "SALES") return lead.salesPicId === user.id;
  return false;
}

/** Manager ✅ | Admin ✅ | Super Admin ✅ | Sales ❌ */
export function canReassignLead(user: SessionUser): boolean {
  return (
    user.role === "MANAGER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN"
  );
}

/**
 * Sales: hanya lead miliknya | Manager: semua | Admin: semua | Super Admin: semua
 */
export function canEditLead(user: SessionUser, lead: LeadRecord): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "MANAGER" || user.role === "ADMIN") return true;
  if (user.role === "SALES") return lead.salesPicId === user.id;
  return false;
}

// ---------------------------------------------------------------------------
// BOOKING permissions
// ---------------------------------------------------------------------------

/** Sales ✅ | Manager ✅ | Admin ✅ | Super Admin ✅ */
export function canCreateBooking(user: SessionUser): boolean {
  return true;
}

/** Manager ✅ | Super Admin ✅ | Sales ❌ | Admin ❌ */
export function canApproveBooking(user: SessionUser): boolean {
  return ROLES_CAN_APPROVE.includes(user.role);
}

/** Sales: hanya booking miliknya | Lainnya: semua */
export function canViewBooking(
  user: SessionUser,
  booking: BookingRecord
): boolean {
  if (user.role === "SALES") return booking.salesId === user.id;
  return true;
}

/** Admin ✅ | Super Admin ✅ | Lainnya ❌ */
export function canUpdatePaymentStatus(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

// ---------------------------------------------------------------------------
// UNIT & INVENTORY permissions
// ---------------------------------------------------------------------------

/** Admin ✅ | Super Admin ✅ | Lainnya ❌ */
export function canManageInventory(user: SessionUser): boolean {
  return ROLES_CAN_MANAGE_INVENTORY.includes(user.role);
}

/** Sales ✅ | Manager ✅ | Super Admin ✅ | Admin ❌ (kelola langsung) */
export function canRequestUnitHold(user: SessionUser): boolean {
  return (
    user.role === "SALES" ||
    user.role === "MANAGER" ||
    user.role === "SUPER_ADMIN"
  );
}

// ---------------------------------------------------------------------------
// DOKUMEN permissions
// ---------------------------------------------------------------------------

/** Sales ✅ | Manager ✅ | Admin ✅ | Super Admin ✅ */
export function canUploadDocument(user: SessionUser): boolean {
  return true;
}

/** Admin & Super Admin: semua dokumen | Lainnya: hanya miliknya */
export function canDeleteDocument(
  user: SessionUser,
  doc: DocumentRecord
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  return doc.uploadedBy === user.id;
}

// ---------------------------------------------------------------------------
// LAPORAN permissions
// ---------------------------------------------------------------------------

export function canExportReport(_user: SessionUser): boolean {
  return true;
}

/** Manager ✅ | Admin ✅ | Super Admin ✅ | Sales ❌ */
export function canViewExecutiveDashboard(user: SessionUser): boolean {
  return hasMinimumRole(user.role, "MANAGER");
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT permissions
// ---------------------------------------------------------------------------

/** Super Admin ✅ saja */
export function canManageUsers(user: SessionUser): boolean {
  return ROLES_CAN_MANAGE_USERS.includes(user.role);
}

/** Admin ✅ | Manager ✅ | Super Admin ✅ | Sales ❌ */
export function canAccessSettings(user: SessionUser): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    user.role === "SUPER_ADMIN"
  );
}

// ---------------------------------------------------------------------------
// Route permissions — untuk middleware
// ---------------------------------------------------------------------------

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard": ["SALES", "MANAGER", "ADMIN", "SUPER_ADMIN"],
  "/leads":     ["SALES", "MANAGER", "ADMIN", "SUPER_ADMIN"],
  "/units":     ["SALES", "MANAGER", "ADMIN", "SUPER_ADMIN"],
  "/bookings":  ["SALES", "MANAGER", "ADMIN", "SUPER_ADMIN"],
  "/reports":   ["SALES", "MANAGER", "ADMIN", "SUPER_ADMIN"],
  "/settings":  ["ADMIN", "MANAGER", "SUPER_ADMIN"],
  "/settings/users": ["SUPER_ADMIN"],
};

export function canAccessRoute(user: SessionUser, pathname: string): boolean {
  const matchingRoutes = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  const requiredRoles = ROUTE_PERMISSIONS[matchingRoutes[0]];
  return requiredRoles.includes(user.role);
}
