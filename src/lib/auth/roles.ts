/**
 * Konstanta role dan helper otorisasi — CRM Graha Padma
 *
 * Role baru (4 role):
 *   SALES       = Sales Executive lama
 *   MANAGER     = Sales Manager lama + Management/Owner (digabung)
 *   ADMIN       = Admin/Back Office lama
 *   SUPER_ADMIN = tetap sama
 */
import type { UserRole } from "@/types";

/** Hierarki role dari yang paling terbatas ke paling luas */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SALES:       1,
  ADMIN:       2,
  MANAGER:     3,
  SUPER_ADMIN: 4,
};

/** Label display untuk tiap role — dipakai di UI badge */
export const ROLE_LABELS: Record<UserRole, string> = {
  SALES:       "Sales",
  MANAGER:     "Manager",
  ADMIN:       "Admin",
  SUPER_ADMIN: "Super Admin",
};

/** Warna badge tiap role — sesuai design system teal/neutral */
export const ROLE_COLORS: Record<UserRole, string> = {
  SALES:       "bg-blue-100 text-blue-700",
  MANAGER:     "bg-teal-100 text-teal-700",
  ADMIN:       "bg-orange-100 text-orange-700",
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
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

/** Role yang bisa melakukan approval booking */
export const ROLES_CAN_APPROVE: UserRole[] = [
  "MANAGER",
  "SUPER_ADMIN",
];

/** Role yang bisa mengelola master data unit/cluster */
export const ROLES_CAN_MANAGE_INVENTORY: UserRole[] = [
  "ADMIN",
  "SUPER_ADMIN",
];

/** Role yang bisa mengelola user */
export const ROLES_CAN_MANAGE_USERS: UserRole[] = ["SUPER_ADMIN"];

/**
 * Redirect tujuan setelah login per role.
 */
export const ROLE_DEFAULT_REDIRECT: Record<UserRole, string> = {
  SALES:       "/leads",
  MANAGER:     "/dashboard",
  ADMIN:       "/bookings",
  SUPER_ADMIN: "/dashboard",
};
