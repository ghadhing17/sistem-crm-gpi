"use client";

/**
 * ActivityTimeline — timeline aktivitas lead
 * PRD 5.3: timeline kronologis, kosong state, timestamp + nama user
 */

import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface Activity {
  id: string;
  jenis: string;
  ringkasan: string;
  reminderAt: string | null;
  createdAt: string;
  user: { id: string; nama: string; role: string };
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Konfigurasi per jenis aktivitas
// ---------------------------------------------------------------------------

const JENIS_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;   // bg warna dot & ikon
  textColor: string;
}> = {
  TELEPON: {
    label: "Telepon",
    color: "bg-blue-100",
    textColor: "text-blue-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  WHATSAPP: {
    label: "WhatsApp",
    color: "bg-green-100",
    textColor: "text-green-600",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.548 4.085 1.505 5.8L.057 23.569l5.921-1.556A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.659-.52-5.169-1.422l-.371-.22-3.515.923.938-3.426-.242-.394A9.966 9.966 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
      </svg>
    ),
  },
  MEETING: {
    label: "Meeting",
    color: "bg-purple-100",
    textColor: "text-purple-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  SITE_VISIT: {
    label: "Site Visit",
    color: "bg-orange-100",
    textColor: "text-orange-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  CATATAN: {
    label: "Catatan",
    color: "bg-gray-100",
    textColor: "text-gray-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
};

// ---------------------------------------------------------------------------
// Komponen item timeline
// ---------------------------------------------------------------------------

function TimelineItem({ activity }: { activity: Activity }) {
  const meta = JENIS_META[activity.jenis] ?? JENIS_META.CATATAN;
  const tanggalRelative = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
    locale: localeId,
  });
  const tanggalAbsolut = format(new Date(activity.createdAt), "d MMM yyyy, HH:mm", {
    locale: localeId,
  });
  const hasReminder = !!activity.reminderAt && new Date(activity.reminderAt) > new Date();

  return (
    <div className="flex gap-3">
      {/* Icon dot */}
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color} ${meta.textColor}`}>
          {meta.icon}
        </div>
        {/* Garis vertikal — disembunyikan di item terakhir via CSS di parent */}
        <div className="w-px flex-1 bg-gray-100 mt-1.5" />
      </div>

      {/* Konten */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-semibold ${meta.textColor}`}>{meta.label}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs font-medium text-gray-700">{activity.user.nama}</span>
          <span className="text-xs text-gray-400">·</span>
          <span
            className="text-xs text-gray-400"
            title={tanggalAbsolut}
          >
            {tanggalRelative}
          </span>
        </div>

        {/* Ringkasan */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
            {activity.ringkasan}
          </p>
        </div>

        {/* Reminder badge */}
        {hasReminder && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Reminder:{" "}
            {format(new Date(activity.reminderAt!), "d MMM yyyy, HH:mm", { locale: localeId })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Belum ada aktivitas</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
          Mulai dengan menghubungi lead ini — klik tombol &quot;Log Aktivitas&quot; di atas
        </p>
      </div>
    );
  }

  return (
    <div>
      {activities.map((activity, idx) => (
        <div
          key={activity.id}
          // Sembunyikan garis vertikal di item terakhir
          className={idx === activities.length - 1 ? "[&_.w-px]:hidden" : ""}
        >
          <TimelineItem activity={activity} />
        </div>
      ))}
    </div>
  );
}
