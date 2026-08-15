/**
 * Konstanta role dan helper otorisasi.
 * Implementasi penuh via Auth.js akan ditambahkan di Fase 1.
 *
 * Sesuai PRD Bab 10.3 — RBAC ditegakkan di backend, bukan hanya di UI.
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

/** Cek apakah role memiliki privilege >= role yang dibutuhkan */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
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
