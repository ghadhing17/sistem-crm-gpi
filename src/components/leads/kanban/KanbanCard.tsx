"use client";

/**
 * KanbanCard — kartu lead di kolom kanban
 * PRD 5.2: nama, ikon sumber, badge hari tanpa aktivitas (merah >3 hari)
 */

import { Draggable } from "@hello-pangea/dnd";
import Link from "next/link";

export interface KanbanLead {
  id: string;
  nama: string;
  noHp: string;
  sumber: string;
  statusPipeline: string;
  tagKualifikasi: string | null;
  salesPicId: string | null;
  salesPic: { id: string; nama: string } | null;
  minatCluster: { id: string; namaCluster: string } | null;
  minatTipe: string | null;
  createdAt: string;
  activities: { createdAt: string }[];
}

interface KanbanCardProps {
  lead: KanbanLead;
  index: number;
  /** Apakah kartu ini boleh di-drag oleh user yang sedang login */
  isDraggable: boolean;
}

// ---------------------------------------------------------------------------
// Ikon sumber lead — SVG inline ringkas
// ---------------------------------------------------------------------------

const SUMBER_ICON: Record<string, React.ReactNode> = {
  WHATSAPP: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.548 4.085 1.505 5.8L.057 23.569l5.921-1.556A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.659-.52-5.169-1.422l-.371-.22-3.515.923.938-3.426-.242-.394A9.966 9.966 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
    </svg>
  ),
  TELEPON: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  WEBSITE: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  FACEBOOK_ADS: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  GOOGLE_ADS: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
  ),
  INSTAGRAM: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
};

const SUMBER_DEFAULT = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const SUMBER_COLORS: Record<string, string> = {
  WHATSAPP:    "text-green-600 bg-green-50",
  TELEPON:     "text-blue-600 bg-blue-50",
  WEBSITE:     "text-indigo-600 bg-indigo-50",
  FACEBOOK_ADS:"text-blue-700 bg-blue-50",
  GOOGLE_ADS:  "text-red-500 bg-red-50",
  INSTAGRAM:   "text-pink-600 bg-pink-50",
  PAMERAN:     "text-amber-600 bg-amber-50",
  REFERRAL:    "text-purple-600 bg-purple-50",
  LAINNYA:     "text-gray-500 bg-gray-50",
};

const KUALIFIKASI_DOT: Record<string, string> = {
  HOT:  "bg-red-500",
  WARM: "bg-amber-400",
  COLD: "bg-blue-400",
};

// ---------------------------------------------------------------------------
// Helper SLA
// ---------------------------------------------------------------------------

function hitungHariSejak(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Komponen
// ---------------------------------------------------------------------------

export default function KanbanCard({ lead, index, isDraggable }: KanbanCardProps) {
  const lastActivity = lead.activities[0];
  const hariSejak = hitungHariSejak(
    lastActivity?.createdAt ?? lead.createdAt
  );
  const slaAlert = hariSejak >= 3;
  const belumDihubungi = !lastActivity;

  const sumberColor = SUMBER_COLORS[lead.sumber] ?? "text-gray-500 bg-gray-50";
  const sumberIcon  = SUMBER_ICON[lead.sumber] ?? SUMBER_DEFAULT;

  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={!isDraggable}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl border p-3 mb-2 transition-all select-none ${
            snapshot.isDragging
              ? "border-[#009182] shadow-lg shadow-teal-100/50 rotate-1 opacity-95"
              : isDraggable
                ? "border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-grab active:cursor-grabbing"
                : "border-gray-100 cursor-default opacity-80"
          }`}
        >
          {/* Baris atas: ikon sumber + kualifikasi dot + SLA badge */}
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${sumberColor}`}>
              {sumberIcon}
            </span>
            <div className="flex items-center gap-1.5">
              {lead.tagKualifikasi && (
                <span
                  className={`w-2 h-2 rounded-full ${KUALIFIKASI_DOT[lead.tagKualifikasi]}`}
                  title={lead.tagKualifikasi}
                />
              )}
              {/* Badge SLA — merah jika ≥3 hari */}
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                  slaAlert
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
                }`}
                title={
                  belumDihubungi
                    ? `Belum pernah dihubungi (${hariSejak}h)`
                    : `Terakhir dihubungi ${hariSejak} hari lalu`
                }
              >
                {slaAlert && <span className="text-xs leading-none">⚠</span>}
                {hariSejak}h
              </span>
            </div>
          </div>

          {/* Nama lead */}
          <Link
            href={`/leads/${lead.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block text-sm font-semibold text-gray-900 hover:text-[#009182] transition-colors leading-tight mb-1 line-clamp-1"
          >
            {lead.nama}
          </Link>

          {/* Minat & no HP */}
          {(lead.minatCluster || lead.minatTipe) && (
            <p className="text-xs text-gray-500 truncate mb-1">
              {[lead.minatCluster?.namaCluster, lead.minatTipe].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Sales PIC (hanya tampil jika bukan milik sendiri — untuk Manager view) */}
          {lead.salesPic && (
            <p className="text-xs text-gray-400 truncate">
              {lead.salesPic.nama}
            </p>
          )}

          {/* Indikator tidak bisa di-drag */}
          {!isDraggable && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Bukan lead Anda
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
