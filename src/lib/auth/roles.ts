/**
 * Konstanta role dan helper otorisasi — CRM Graha Padma
 * Sesuai PRD Bab 3 & 10.3 — RBAC ditegakkan di backend, bukan hanya di UI.
 */
import type { UserRole } from "@/types";

/** Hierarki role dari yang paling terbatas ke paling luas */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SALES_EXECUTIVE: 1,
  ADMIN_BACK_OFFICE: 2,
  SALES_MANAGER: 3,
  MANAGEMENT: 4,
  SUPER_ADMIN: 5,
};

/** Label display untuk tiap role — dipakai di UI badge */
export const ROLE_LABELS: Record<UserRole, string> = {
  SALES_EXECUTIVE: "Sales Executive",
  SALES_MANAGER: "Sales Manager",
  ADMIN_BACK_OFFICE: "Admin / Back Office",
  MANAGEMENT: "Management",
  SUPER_ADMIN: "Super Admin",
};

/** Warna badge tiap role — sesuai design system teal/neutral */
export const ROLE_COLORS: Record<UserRole, string> = {
  SALES_EXECUTIVE: "bg-blue-100 text-blue-700",
  SALES_MANAGER: "bg-teal-100 text-teal-700",
  ADMIN_BACK_OFFICE: "bg-orange-100 text-orange-700",
  MANAGEMENT: "bg-purple-100 text-purple-700",
  SUPER_ADMIN: "bg-red-100 text-red-700",
};

/** Cek apakah role memiliki privilege >= role yang dibutuhkan */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Role yang bisa melihat semua lead (bukan hanya milik sendiri) */
export const ROLES_CAN_VIEW_ALL_LEADS: UserRole[] = [
  "SALES_MANAGER",
  "ADMIN_BACK_OFFICE",
  "MANAGEMENT",
  "SUPER_ADMIN",
];

/** Role yang bisa melakukan approval booking */
export const ROLES_CAN_APPROVE: UserRole[] = [
  "SALES_MANAGER",
  "MANAGEMENT",
  "SUPER_ADMIN",
];

/** Role yang bisa mengelola master data unit/cluster */
export const ROLES_CAN_MANAGE_INVENTORY: UserRole[] = [
  "ADMIN_BACK_OFFICE",
  "SUPER_ADMIN",
];

/** Role yang bisa mengelola user */
export const ROLES_CAN_MANAGE_USERS: UserRole[] = ["SUPER_ADMIN"];

/**
 * Redirect tujuan setelah login per role.
 * Sales → leads, Management → reports, Admin BO → bookings, dsb.
 */
export const ROLE_DEFAULT_REDIRECT: Record<UserRole, string> = {
  SALES_EXECUTIVE: "/leads",
  SALES_MANAGER: "/dashboard",
  ADMIN_BACK_OFFICE: "/bookings",
  MANAGEMENT: "/reports/executive",
  SUPER_ADMIN: "/dashboard",
};
