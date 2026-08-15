-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SALES_EXECUTIVE', 'SALES_MANAGER', 'ADMIN_BACK_OFFICE', 'MANAGEMENT', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('BARU', 'DIHUBUNGI', 'KUALIFIKASI', 'SITE_VISIT', 'NEGOSIASI', 'BOOKING', 'CLOSING', 'LOST');

-- CreateEnum
CREATE TYPE "LeadKualifikasi" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "SumberLead" AS ENUM ('WHATSAPP', 'TELEPON', 'WEBSITE', 'FACEBOOK_ADS', 'GOOGLE_ADS', 'PAMERAN', 'REFERRAL', 'INSTAGRAM', 'LAINNYA');

-- CreateEnum
CREATE TYPE "JenisActivity" AS ENUM ('TELEPON', 'WHATSAPP', 'MEETING', 'SITE_VISIT', 'CATATAN');

-- CreateEnum
CREATE TYPE "StatusUnit" AS ENUM ('TERSEDIA', 'NEGOSIASI', 'BOOKED', 'TERJUAL', 'TIDAK_DIJUAL');

-- CreateEnum
CREATE TYPE "SkemaPembayaran" AS ENUM ('CASH', 'KPR', 'CASH_BERTAHAP');

-- CreateEnum
CREATE TYPE "StatusBooking" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'DISETUJUI', 'DITOLAK', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusChecklist" AS ENUM ('BELUM_MULAI', 'DIPROSES', 'SELESAI', 'BERMASALAH');

-- CreateEnum
CREATE TYPE "JenisNotifikasi" AS ENUM ('LEAD_BARU_MASUK', 'LEAD_DIASSIGN', 'REMINDER_FOLLOWUP', 'LEAD_TIDAK_AKTIF', 'BOOKING_MENUNGGU_APPROVAL', 'BOOKING_DISETUJUI', 'BOOKING_DITOLAK', 'DOKUMEN_DIUPLOAD', 'CHECKLIST_UPDATE', 'APPROVAL_KADALUARSA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "timId" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "namaTim" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "email" TEXT,
    "sumber" "SumberLead" NOT NULL,
    "minatClusterId" TEXT,
    "minatTipe" TEXT,
    "statusPipeline" "LeadStatus" NOT NULL DEFAULT 'BARU',
    "tagKualifikasi" "LeadKualifikasi",
    "salesPicId" TEXT,
    "isDuplikatDari" TEXT,
    "alasanLost" TEXT,
    "catatanNegosiasi" TEXT,
    "holdUnitId" TEXT,
    "holdExpiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "jenis" "JenisActivity" NOT NULL,
    "ringkasan" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clusters" (
    "id" TEXT NOT NULL,
    "namaCluster" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "blok" TEXT NOT NULL,
    "noKavling" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "luasTanah" DOUBLE PRECISION NOT NULL,
    "luasBangunan" DOUBLE PRECISION NOT NULL,
    "harga" BIGINT NOT NULL,
    "status" "StatusUnit" NOT NULL DEFAULT 'TERSEDIA',
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "salesId" TEXT NOT NULL,
    "hargaNormal" BIGINT NOT NULL,
    "hargaDeal" BIGINT NOT NULL,
    "diskonPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alasanDiskon" TEXT,
    "skemaPembayaran" "SkemaPembayaran" NOT NULL,
    "bookingFee" BIGINT,
    "targetPelunasanDp" TIMESTAMP(3),
    "status" "StatusBooking" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "alasanDitolak" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_checklists" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tahap" INTEGER NOT NULL,
    "namaTahap" TEXT NOT NULL,
    "status" "StatusChecklist" NOT NULL DEFAULT 'BELUM_MULAI',
    "catatan" TEXT,
    "targetDate" TIMESTAMP(3),
    "selesaiAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "leadId" TEXT,
    "jenisDokumen" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "namaFile" TEXT,
    "ukuranBytes" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jenis" "JenisNotifikasi" NOT NULL,
    "pesan" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkRef" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_statusAktif_idx" ON "users"("role", "statusAktif");

-- CreateIndex
CREATE INDEX "leads_noHp_idx" ON "leads"("noHp");

-- CreateIndex
CREATE INDEX "leads_salesPicId_statusPipeline_idx" ON "leads"("salesPicId", "statusPipeline");

-- CreateIndex
CREATE INDEX "leads_statusPipeline_idx" ON "leads"("statusPipeline");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "activities_leadId_createdAt_idx" ON "activities"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_createdBy_idx" ON "activities"("createdBy");

-- CreateIndex
CREATE INDEX "activities_reminderAt_idx" ON "activities"("reminderAt");

-- CreateIndex
CREATE INDEX "units_clusterId_status_idx" ON "units"("clusterId", "status");

-- CreateIndex
CREATE INDEX "units_status_idx" ON "units"("status");

-- CreateIndex
CREATE UNIQUE INDEX "units_clusterId_blok_noKavling_key" ON "units"("clusterId", "blok", "noKavling");

-- CreateIndex
CREATE INDEX "bookings_leadId_idx" ON "bookings"("leadId");

-- CreateIndex
CREATE INDEX "bookings_unitId_status_idx" ON "bookings"("unitId", "status");

-- CreateIndex
CREATE INDEX "bookings_salesId_status_idx" ON "bookings"("salesId", "status");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "booking_checklists_bookingId_idx" ON "booking_checklists"("bookingId");

-- CreateIndex
CREATE INDEX "booking_checklists_status_targetDate_idx" ON "booking_checklists"("status", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "booking_checklists_bookingId_tahap_key" ON "booking_checklists"("bookingId", "tahap");

-- CreateIndex
CREATE INDEX "documents_bookingId_idx" ON "documents"("bookingId");

-- CreateIndex
CREATE INDEX "documents_leadId_idx" ON "documents"("leadId");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entitas_entitasId_idx" ON "audit_logs"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_aksi_createdAt_idx" ON "audit_logs"("aksi", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_timId_fkey" FOREIGN KEY ("timId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_salesPicId_fkey" FOREIGN KEY ("salesPicId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_minatClusterId_fkey" FOREIGN KEY ("minatClusterId") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_isDuplikatDari_fkey" FOREIGN KEY ("isDuplikatDari") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_holdUnitId_fkey" FOREIGN KEY ("holdUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_checklists" ADD CONSTRAINT "booking_checklists_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
