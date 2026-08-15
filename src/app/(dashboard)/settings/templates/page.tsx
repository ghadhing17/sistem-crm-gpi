import type { Metadata } from "next";

export const metadata: Metadata = { title: "Template" };

export default function SettingsTemplatesPage() {
  return <PlaceholderPage title="Template" desc="Template pesan WhatsApp follow-up dan template checklist dokumen per tipe transaksi. Implementasi di Fase 3." icon="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />;
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
