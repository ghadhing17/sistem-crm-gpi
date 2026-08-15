/**
 * Prisma Seed — CRM Graha Padma
 *
 * Berisi data awal minimum untuk testing:
 *   1. Super Admin dummy
 *   2. Satu Team dummy
 *   3. Satu Cluster + 3 Unit dummy
 *   4. Satu Sales Executive dummy (untuk testing pipeline)
 *
 * Jalankan: npx prisma db seed
 * atau:     npm run db:seed
 *
 * PENTING: Script ini idempotent — aman dijalankan berkali-kali.
 * Menggunakan upsert agar tidak error jika data sudah ada.
 */

import { PrismaClient, UserRole, StatusUnit, SumberLead } from '@prisma/client'
import { hash } from '@node-rs/argon2'

const prisma = new PrismaClient()

// Konfigurasi Argon2id — sesuai rekomendasi OWASP 2024
// memory: 64 MB, iterations: 3, parallelism: 4
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB dalam KiB
  timeCost: 3,
  parallelism: 4,
}

async function main() {
  console.log('🌱 Memulai seed database CRM Graha Padma...\n')

  // -------------------------------------------------------------------------
  // 1. Super Admin
  // -------------------------------------------------------------------------
  const superAdminPassword = await hash('Admin@GPI2026!', ARGON2_OPTIONS)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@grahapadma.id' },
    update: {},
    create: {
      nama: 'Super Admin GPI',
      email: 'superadmin@grahapadma.id',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      statusAktif: true,
      // Super Admin seed tidak perlu ganti password — sudah dikonfigurasi manual
      mustChangePassword: false,
    },
  })
  console.log(`✓ Super Admin   : ${superAdmin.email}  (id: ${superAdmin.id})`)

  // -------------------------------------------------------------------------
  // 2. Sales Manager dummy
  // -------------------------------------------------------------------------
  const managerPassword = await hash('Manager@GPI2026!', ARGON2_OPTIONS)

  const salesManager = await prisma.user.upsert({
    where: { email: 'manager@grahapadma.id' },
    update: {},
    create: {
      nama: 'Budi Santoso',
      email: 'manager@grahapadma.id',
      password: managerPassword,
      role: UserRole.SALES_MANAGER,
      statusAktif: true,
      mustChangePassword: true,
    },
  })
  console.log(`✓ Sales Manager : ${salesManager.email}  (id: ${salesManager.id})`)

  // -------------------------------------------------------------------------
  // 3. Team Sales dummy — manager diisi setelah user dibuat
  // -------------------------------------------------------------------------
  const team = await prisma.team.upsert({
    where: { id: 'team-seed-001' },
    update: {},
    create: {
      id: 'team-seed-001',
      namaTim: 'Tim Sales Alpha',
      managerId: salesManager.id,
    },
  })
  console.log(`✓ Team          : ${team.namaTim}  (id: ${team.id})`)

  // Assign manager ke tim
  await prisma.user.update({
    where: { id: salesManager.id },
    data: { timId: team.id },
  })

  // -------------------------------------------------------------------------
  // 4. Sales Executive dummy
  // -------------------------------------------------------------------------
  const salesPassword = await hash('Sales@GPI2026!', ARGON2_OPTIONS)

  const salesExec = await prisma.user.upsert({
    where: { email: 'sales1@grahapadma.id' },
    update: {},
    create: {
      nama: 'Rina Kusuma',
      email: 'sales1@grahapadma.id',
      password: salesPassword,
      role: UserRole.SALES_EXECUTIVE,
      timId: team.id,
      statusAktif: true,
      mustChangePassword: true,
    },
  })
  console.log(`✓ Sales Exec    : ${salesExec.email}  (id: ${salesExec.id})`)

  // -------------------------------------------------------------------------
  // 5. Admin Back Office dummy
  // -------------------------------------------------------------------------
  const adminPassword = await hash('Admin@GPI2026!', ARGON2_OPTIONS)

  const adminBO = await prisma.user.upsert({
    where: { email: 'admin@grahapadma.id' },
    update: {},
    create: {
      nama: 'Dewi Pratiwi',
      email: 'admin@grahapadma.id',
      password: adminPassword,
      role: UserRole.ADMIN_BACK_OFFICE,
      timId: team.id,
      statusAktif: true,
      mustChangePassword: true,
    },
  })
  console.log(`✓ Admin BO      : ${adminBO.email}  (id: ${adminBO.id})`)

  // -------------------------------------------------------------------------
  // 6. Cluster Perumahan dummy
  // -------------------------------------------------------------------------
  const cluster = await prisma.cluster.upsert({
    where: { id: 'cluster-seed-001' },
    update: {},
    create: {
      id: 'cluster-seed-001',
      namaCluster: 'Graha Padma Residence',
      lokasi: 'Jl. Raya Padma No. 1, Denpasar Barat, Bali',
      deskripsi:
        'Cluster perumahan eksklusif dengan konsep modern tropis. Tersedia tipe 36, 45, dan 60.',
    },
  })
  console.log(`✓ Cluster       : ${cluster.namaCluster}  (id: ${cluster.id})`)

  // -------------------------------------------------------------------------
  // 7. Unit dummy — 3 unit dengan status berbeda untuk testing
  // -------------------------------------------------------------------------
  const unitData = [
    {
      id: 'unit-seed-001',
      clusterId: cluster.id,
      blok: 'A',
      noKavling: '01',
      tipe: '36/72',
      luasTanah: 72,
      luasBangunan: 36,
      harga: BigInt(450_000_000), // Rp 450 juta
      status: StatusUnit.TERSEDIA,
      deskripsi: 'Menghadap timur, dekat taman',
    },
    {
      id: 'unit-seed-002',
      clusterId: cluster.id,
      blok: 'A',
      noKavling: '02',
      tipe: '45/90',
      luasTanah: 90,
      luasBangunan: 45,
      harga: BigInt(590_000_000), // Rp 590 juta
      status: StatusUnit.NEGOSIASI,
      deskripsi: 'Unit hook, posisi strategis di sudut blok',
    },
    {
      id: 'unit-seed-003',
      clusterId: cluster.id,
      blok: 'B',
      noKavling: '01',
      tipe: '60/120',
      luasTanah: 120,
      luasBangunan: 60,
      harga: BigInt(850_000_000), // Rp 850 juta
      status: StatusUnit.BOOKED,
      deskripsi: 'Unit premium, view kolam renang',
    },
  ]

  for (const u of unitData) {
    const unit = await prisma.unit.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    })
    console.log(
      `✓ Unit          : Blok ${unit.blok}-${unit.noKavling} (${unit.tipe}) — ${unit.status}`,
    )
  }

  // -------------------------------------------------------------------------
  // 8. Lead dummy — 2 lead untuk testing pipeline
  // -------------------------------------------------------------------------
  const lead1 = await prisma.lead.upsert({
    where: { id: 'lead-seed-001' },
    update: {},
    create: {
      id: 'lead-seed-001',
      nama: 'Ahmad Fauzi',
      noHp: '08123456789',
      email: 'ahmad.fauzi@email.com',
      sumber: SumberLead.INSTAGRAM,
      minatClusterId: cluster.id,
      minatTipe: '45/90',
      statusPipeline: 'SITE_VISIT',
      tagKualifikasi: 'HOT',
      salesPicId: salesExec.id,
    },
  })
  console.log(`✓ Lead 1        : ${lead1.nama} — ${lead1.statusPipeline}`)

  const lead2 = await prisma.lead.upsert({
    where: { id: 'lead-seed-002' },
    update: {},
    create: {
      id: 'lead-seed-002',
      nama: 'Siti Rahayu',
      noHp: '08198765432',
      email: 'siti.rahayu@email.com',
      sumber: SumberLead.REFERRAL,
      minatClusterId: cluster.id,
      minatTipe: '36/72',
      statusPipeline: 'BARU',
      tagKualifikasi: 'WARM',
      // Belum di-assign ke sales — untuk testing unassigned lead alert
      salesPicId: null,
    },
  })
  console.log(`✓ Lead 2        : ${lead2.nama} — ${lead2.statusPipeline} (belum di-assign)`)

  // -------------------------------------------------------------------------
  // Ringkasan
  // -------------------------------------------------------------------------
  console.log('\n✅ Seed selesai! Ringkasan akun untuk login testing:\n')
  console.log('  Role            | Email                        | Password')
  console.log('  ----------------+------------------------------+-------------------')
  console.log('  SUPER_ADMIN     | superadmin@grahapadma.id     | Admin@GPI2026!')
  console.log('  SALES_MANAGER   | manager@grahapadma.id        | Manager@GPI2026!')
  console.log('  SALES_EXECUTIVE | sales1@grahapadma.id         | Sales@GPI2026!')
  console.log('  ADMIN_BO        | admin@grahapadma.id          | Admin@GPI2026!')
  console.log('\n  ⚠  Semua akun (kecuali Super Admin) harus ganti password saat login pertama.')
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
