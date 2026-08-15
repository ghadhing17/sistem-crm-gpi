"use client";

/**
 * KanbanColumn — satu kolom di board kanban
 * Berisi Droppable zone + daftar KanbanCard
 */

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard, { type KanbanLead } from "./KanbanCard";

interface ColMeta {
  label: string;
  color: string;      // warna dot header
  headerBg: string;  // background header kolom
}

export const COLUMN_META: Record<string, ColMeta> = {
  BARU:        { label: "Baru",        color: "bg-blue-400",   headerBg: "bg-blue-50" },
  DIHUBUNGI:   { label: "Dihubungi",   color: "bg-sky-400",    headerBg: "bg-sky-50" },
  KUALIFIKASI: { label: "Kualifikasi", color: "bg-purple-400", headerBg: "bg-purple-50" },
  SITE_VISIT:  { label: "Site Visit",  color: "bg-orange-400", headerBg: "bg-orange-50" },
  NEGOSIASI:   { label: "Negosiasi",   color: "bg-amber-400",  headerBg: "bg-amber-50" },
  BOOKING:     { label: "Booking",     color: "bg-teal-400",   headerBg: "bg-teal-50" },
  CLOSING:     { label: "Closing",     color: "bg-green-400",  headerBg: "bg-green-50" },
  LOST:        { label: "Lost",        color: "bg-red-400",    headerBg: "bg-red-50" },
};

interface KanbanColumnProps {
  status: string;
  leads: KanbanLead[];
  currentUserId: string;
  canDragAll: boolean;  // Manager/Super Admin bisa drag semua; Sales Exec hanya miliknya
}

export default function KanbanColumn({
  status,
  leads,
  currentUserId,
  canDragAll,
}: KanbanColumnProps) {
  const meta = COLUMN_META[status] ?? { label: status, color: "bg-gray-400", headerBg: "bg-gray-50" };
  const slaCount = leads.filter((l) => {
    const lastAct = l.activities[0];
    const ref = lastAct?.createdAt ?? l.createdAt;
    return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)) >= 3;
  }).length;

  return (
    <div className="flex flex-col min-w-[240px] max-w-[260px] w-[252px]">
      {/* Header kolom */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-2 ${meta.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.color}`} />
          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {slaCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
              title={`${slaCount} lead belum ditindaklanjuti >3 hari`}
            >
              ⚠ {slaCount}
            </span>
          )}
          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-600 shadow-sm">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] rounded-xl p-2 transition-colors ${
              snapshot.isDraggingOver
                ? "bg-teal-50/60 border-2 border-dashed border-[#009182]/40"
                : "bg-gray-50/40"
            }`}
          >
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs text-gray-400">
                Tidak ada lead
              </div>
            )}
            {leads.map((lead, idx) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                index={idx}
                isDraggable={canDragAll || lead.salesPicId === currentUserId}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
