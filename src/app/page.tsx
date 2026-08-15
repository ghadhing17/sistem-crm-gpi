import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Berhasil",
};

const checks = [
  { label: "Next.js 15 (App Router)", ok: true },
  { label: "TypeScript", ok: true },
  { label: "TailwindCSS v4", ok: true },
  { label: "ESLint + Prettier", ok: true },
  { label: "Docker Compose (app + PostgreSQL)", ok: true },
  { label: "Struktur folder src/ (app, components, lib, types, hooks)", ok: true },
  { label: "Prisma schema placeholder", ok: true },
];

const routes = [
  { path: "/login", keterangan: "Autentikasi" },
  { path: "/dashboard", keterangan: "Dashboard (redirect per role)" },
  { path: "/leads", keterangan: "Daftar Lead (table view)" },
  { path: "/leads/pipeline", keterangan: "Pipeline Lead (kanban)" },
  { path: "/leads/[id]", keterangan: "Detail Lead" },
  { path: "/units", keterangan: "Daftar Cluster" },
  { path: "/units/[clusterId]", keterangan: "Peta Blok Unit" },
  { path: "/bookings", keterangan: "Daftar Booking" },
  { path: "/bookings/[id]", keterangan: "Checklist Proses" },
  { path: "/reports/sales", keterangan: "Laporan Sales" },
  { path: "/reports/inventory", keterangan: "Laporan Inventory" },
  { path: "/reports/executive", keterangan: "Dashboard Eksekutif (Management)" },
  { path: "/settings/master-data", keterangan: "Master Data" },
  { path: "/settings/users", keterangan: "Manajemen User" },
  { path: "/settings/templates", keterangan: "Template WA & Checklist" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-900 to-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-5 shadow-lg">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            CRM Graha Padma
          </h1>
          <p className="mt-2 text-brand-400 font-medium text-lg">
            Setup Berhasil
          </p>
          <p className="mt-1 text-gray-400 text-sm">
            Kerangka project siap — belum ada fitur yang dibangun.
          </p>
        </div>

        {/* Checklist Setup */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 backdrop-blur-sm">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Komponen Terinstall
          </h2>
          <ul className="space-y-2.5">
            {checks.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/20 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-brand-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="text-gray-300 text-sm">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Route Plan */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Rencana Route (PRD Bab 11.1)
          </h2>
          <div className="space-y-2">
            {routes.map((r) => (
              <div key={r.path} className="flex items-baseline gap-3">
                <code className="text-brand-400 text-xs font-mono flex-shrink-0 w-56">
                  {r.path}
                </code>
                <span className="text-gray-500 text-xs">{r.keterangan}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Jalankan dengan{" "}
          <code className="text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
            docker compose up
          </code>{" "}
          &mdash; app tersedia di{" "}
          <code className="text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
            http://localhost:3000
          </code>
        </p>
      </div>
    </main>
  );
}
