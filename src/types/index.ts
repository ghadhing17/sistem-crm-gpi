/**
 * Tipe-tipe domain utama CRM Graha Padma.
 * Dikelompokkan sesuai modul PRD — tambahkan field saat implementasi fitur masing-masing.
 */

// ---------------------------------------------------------------------------
// Auth & User
// ---------------------------------------------------------------------------

export type UserRole =
  | "SALES"
  | "MANAGER"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface User {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  timId: string | null;
  statusAktif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: Pick<User, "id" | "nama" | "email" | "role">;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Lead Management
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "BARU"
  | "DIHUBUNGI"
  | "KUALIFIKASI"
  | "SITE_VISIT"
  | "NEGOSIASI"
  | "BOOKING"
  | "CLOSING"
  | "LOST";

export type LeadKualifikasi = "HOT" | "WARM" | "COLD";

export type SumberLead =
  | "WHATSAPP"
  | "TELEPON"
  | "WEBSITE"
  | "FACEBOOK_ADS"
  | "GOOGLE_ADS"
  | "PAMERAN"
  | "REFERRAL"
  | "INSTAGRAM"
  | "LAINNYA";

export interface Lead {
  id: string;
  nama: string;
  noHp: string;
  email: string | null;
  sumber: SumberLead;
  minatClusterId: string | null;
  minatTipe: string | null;
  statusPipeline: LeadStatus;
  tagKualifikasi: LeadKualifikasi | null;
  salesPicId: string | null;
  isDuplikatDari: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Unit & Inventory
// ---------------------------------------------------------------------------

export type StatusUnit =
  | "TERSEDIA"
  | "NEGOSIASI"
  | "BOOKED"
  | "TERJUAL"
  | "TIDAK_DIJUAL";

export interface Cluster {
  id: string;
  namaCluster: string;
  lokasi: string;
}

export interface Unit {
  id: string;
  clusterId: string;
  blok: string;
  noKavling: string;
  tipe: string;
  luasTanah: number;
  luasBangunan: number;
  harga: number;
  status: StatusUnit;
}

// ---------------------------------------------------------------------------
// Booking & Transaksi
// ---------------------------------------------------------------------------

export type SkemaPembayaran = "CASH" | "KPR" | "CASH_BERTAHAP";

export type StatusBooking =
  | "DRAFT"
  | "MENUNGGU_APPROVAL"
  | "DISETUJUI"
  | "DITOLAK"
  | "SELESAI";

export interface Booking {
  id: string;
  leadId: string;
  unitId: string;
  salesId: string;
  hargaDeal: number;
  diskonPersen: number;
  skemaPembayaran: SkemaPembayaran;
  status: StatusBooking;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Utilitas umum
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
