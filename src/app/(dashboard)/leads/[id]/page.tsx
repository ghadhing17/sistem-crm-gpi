import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detail Lead" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  return <PlaceholderPage title="Detail Lead" desc={`Profil lengkap, timeline aktivitas, dan riwayat booking lead (ID: ${id}). Implementasi di Fase 1.`} icon="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
}

function PlaceholderPage({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-[#009182]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed">{desc}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Dalam pengembangan
      </span>
    </div>
  );
}
