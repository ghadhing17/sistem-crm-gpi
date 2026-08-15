"use client";

/**
 * BuatBookingModal — Form buat booking dari halaman detail lead
 * PRD 5.5 & 6.2 langkah 5:
 * - Pilih unit (auto-terisi jika lead sudah di-hold)
 * - Harga normal (dari unit), harga deal (input sales)
 * - Skema pembayaran, booking fee, target pelunasan DP
 * - Kalkulasi diskon otomatis + warning jika melebihi threshold
 */

import { useState, useEffect, useTransition } from "react";

interface Unit {
  id: string; blok: string; noKavling: string; tipe: string;
  harga: string; status: string;
  cluster: { namaCluster: string };
}

interface BuatBookingModalProps {
  leadId: string;
  leadNama: string;
  /** Unit yang sudah di-hold lead ini (pre-fill) */
  holdUnit?: { id: string; blok: string; noKavling: string; tipe: string; harga: string; cluster: { namaCluster: string } };
  onBerhasil: (booking: { id: string; status: string; butuhApproval: boolean }) => void;
  onTutup: () => void;
}

const SKEMA_OPTIONS = [
  { value: "CASH",         label: "Cash" },
  { value: "KPR",          label: "KPR (Kredit Pemilikan Rumah)" },
  { value: "CASH_BERTAHAP",label: "Cash Bertahap" },
];

function formatRupiah(val: string | number): string {
  const n = typeof val === "string" ? parseInt(val) : Math.round(val);
  if (isNaN(n)) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function BuatBookingModal({
  leadId, leadNama, holdUnit, onBerhasil, onTutup,
}: BuatBookingModalProps) {
  const [units, setUnits]               = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(holdUnit?.id ?? "");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(
    holdUnit ? { ...holdUnit, status: "NEGOSIASI" } : null
  );
  const [hargaDeal, setHargaDeal]       = useState(holdUnit?.harga ?? "");
  const [skema, setSkema]               = useState("KPR");
  const [bookingFee, setBookingFee]     = useState("");
  const [targetDp, setTargetDp]         = useState("");
  const [alasanDiskon, setAlasanDiskon] = useState("");
  const [threshold, setThreshold]       = useState(5);
  const [error, setError]               = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  // Hitung diskon
  const hargaNormal = selectedUnit ? parseInt(selectedUnit.harga) : 0;
  const hargaDealNum = parseInt(hargaDeal) || 0;
  const diskonPersen = hargaNormal > 0 && hargaDealNum > 0
    ? Math.max(0, ((hargaNormal - hargaDealNum) / hargaNormal) * 100)
    : 0;
  const butuhApproval = diskonPersen > threshold;

  // Load unit TERSEDIA + NEGOSIASI untuk dropdown
  useEffect(() => {
    fetch("/api/units?status=TERSEDIA")
      .then((r) => r.json())
      .then((res) => {
        const available = res.data?.units ?? [];
        // Tambahkan unit yang di-hold jika belum ada di list
        if (holdUnit && !available.find((u: Unit) => u.id === holdUnit.id)) {
          available.unshift({ ...holdUnit, status: "NEGOSIASI" });
        }
        setUnits(available);
      })
      .catch(() => {});

    // Load threshold
    fetch("/api/settings/diskon-threshold")
      .then((r) => r.json())
      .then((res) => { if (res.data?.threshold) setThreshold(res.data.threshold); })
      .catch(() => {});
  }, [holdUnit]);

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = units.find((u) => u.id === unitId) ?? null;
    setSelectedUnit(unit);
    setHargaDeal(unit?.harga ?? "");
    setAlasanDiskon("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedUnitId) { setError("Pilih unit terlebih dahulu"); return; }
    if (!hargaDeal || hargaDealNum <= 0) { setError("Harga deal wajib diisi"); return; }
    if (hargaDealNum > hargaNormal) { setError("Harga deal tidak boleh melebihi harga normal"); return; }
    if (butuhApproval && !alasanDiskon.trim()) { setError("Alasan diskon wajib diisi karena diskon melebihi batas"); return; }

    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          unitId:           selectedUnitId,
          hargaNormal,
          hargaDeal:        hargaDealNum,
          diskonPersen,
          alasanDiskon:     alasanDiskon || null,
          skemaPembayaran:  skema,
          bookingFee:       bookingFee ? parseInt(bookingFee) : null,
          targetPelunasanDp: targetDp ? new Date(targetDp).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal membuat booking"); return; }
      onBerhasil({
        id:            json.data.booking.id,
        status:        json.data.booking.status,
        butuhApproval: json.data.butuhApproval,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Buat Booking</h2>
            <p className="text-xs text-gray-500 mt-0.5">Lead: {leadNama}</p>
          </div>
          <button onClick={onTutup} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Tutup">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <form onSubmit={handleSubmit} id="booking-form" className="space-y-4">
            {/* Pilih Unit */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Unit <span className="text-red-500">*</span>
                {holdUnit && <span className="ml-2 text-xs text-amber-600 font-normal">(sudah di-hold)</span>}
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
              >
                <option value="">Pilih unit tersedia...</option>
                {holdUnit && (
                  <option value={holdUnit.id}>
                    [{holdUnit.cluster.namaCluster}] Blok {holdUnit.blok}-{holdUnit.noKavling} ({holdUnit.tipe}) — {formatRupiah(holdUnit.harga)} ★ Di-hold
                  </option>
                )}
                {units.filter((u) => u.id !== holdUnit?.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.cluster.namaCluster}] Blok {u.blok}-{u.noKavling} ({u.tipe}) — {formatRupiah(u.harga)}
                  </option>
                ))}
              </select>
            </div>

            {selectedUnit && (
              <>
                {/* Info harga normal */}
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Harga Normal Unit</span>
                  <span className="text-sm font-semibold text-gray-900">{formatRupiah(selectedUnit.harga)}</span>
                </div>

                {/* Harga Deal */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Harga Deal (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={hargaNormal}
                    value={hargaDeal}
                    onChange={(e) => { setHargaDeal(e.target.value); setError(null); }}
                    placeholder={selectedUnit.harga}
                    disabled={isPending}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
                  />
                  {hargaDealNum > 0 && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{formatRupiah(hargaDealNum)}</span>
                      {diskonPersen > 0 && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          butuhApproval
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          Diskon {diskonPersen.toFixed(1)}%
                          {butuhApproval && ` — perlu approval Manager (batas ${threshold}%)`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Alasan diskon — wajib jika butuh approval */}
                {butuhApproval && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Alasan Diskon <span className="text-red-500">*</span>
                      <span className="ml-1 font-normal text-amber-600">(diskon melebihi batas, perlu approval)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={alasanDiskon}
                      onChange={(e) => setAlasanDiskon(e.target.value)}
                      placeholder="Jelaskan alasan pemberian diskon di atas standar..."
                      disabled={isPending}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-amber-300 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 resize-none"
                    />
                  </div>
                )}

                {/* Skema Pembayaran */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Skema Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {SKEMA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSkema(opt.value)}
                        className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                          skema === opt.value
                            ? "border-[#009182] bg-teal-50 text-[#009182]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Booking Fee */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Booking Fee / DP Awal (Rp) <span className="text-xs text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={bookingFee}
                    onChange={(e) => setBookingFee(e.target.value)}
                    placeholder="5000000"
                    disabled={isPending}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
                  />
                  {bookingFee && !isNaN(parseInt(bookingFee)) && (
                    <p className="text-xs text-gray-500 mt-0.5">{formatRupiah(bookingFee)}</p>
                  )}
                </div>

                {/* Target Pelunasan DP */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Target Pelunasan DP <span className="text-xs text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="date"
                    value={targetDp}
                    onChange={(e) => setTargetDp(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    disabled={isPending}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
                  />
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button type="button" onClick={onTutup} disabled={isPending}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Batal
          </button>
          <button type="submit" form="booking-form" disabled={isPending || !selectedUnitId}
            className="flex-1 py-2.5 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
            {isPending ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Menyimpan...</>
            ) : butuhApproval ? "Ajukan ke Manager" : "Buat Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
