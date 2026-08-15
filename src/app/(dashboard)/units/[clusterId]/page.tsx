import type { Metadata } from "next";

export const metadata: Metadata = { title: "Peta Blok Cluster" };

interface Props {
  params: Promise<{ clusterId: string }>;
}

export default async function ClusterPage({ params }: Props) {
  const { clusterId } = await params;
  return <PlaceholderPage title="Peta Blok Unit" desc={`Grid kavling berwarna per status untuk cluster ${clusterId}. Implementasi di Fase 1.`} icon="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />;
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
