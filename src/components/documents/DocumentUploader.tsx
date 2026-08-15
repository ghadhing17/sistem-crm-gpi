"use client";

/**
 * DocumentUploader — upload, list, preview, dan hapus dokumen
 * PRD 5.7: upload PDF/gambar, preview di browser, riwayat per lead/booking
 *
 * Props:
 *   leadId    — untuk dokumen terkait lead
 *   bookingId — untuk dokumen terkait booking
 *   readonly  — hanya tampilkan daftar, tidak bisa upload/hapus
 */

import { useState, useEffect, useRef, useTransition } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { canDeleteDocument } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Tipe & Konstanta
// ---------------------------------------------------------------------------

interface DocumentItem {
  id: string;
  jenisDokumen: string;
  namaFile: string | null;
  ukuranBytes: number | null;
  mimeType: string | null;
  uploadedAt: string;
  uploader: { id: string; nama: string };
  uploadedBy?: string; // optional — beberapa response mungkin tidak menyertakan
}

const JENIS_DOKUMEN_OPTIONS = [
  { value: "KTP",        label: "KTP" },
  { value: "KK",         label: "Kartu Keluarga (KK)" },
  { value: "NPWP",       label: "NPWP" },
  { value: "SlipGaji",   label: "Slip Gaji" },
  { value: "SuratNikah", label: "Surat Nikah" },
  { value: "SPR",        label: "Surat Pemesanan Rumah (SPR)" },
  { value: "AkadKredit", label: "Akad Kredit" },
  { value: "Lainnya",    label: "Lainnya" },
];

const JENIS_LABEL: Record<string, string> = Object.fromEntries(
  JENIS_DOKUMEN_OPTIONS.map((o) => [o.value, o.label])
);

const MAX_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "5");

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Komponen Preview Modal
// ---------------------------------------------------------------------------

interface PreviewModalProps {
  docId: string;
  namaFile: string;
  mimeType: string | null;
  onTutup: () => void;
}

function PreviewModal({ docId, namaFile, mimeType, onTutup }: PreviewModalProps) {
  const fileUrl = `/api/documents/${docId}/file`;
  const isPdf   = mimeType === "application/pdf" || namaFile.endsWith(".pdf");
  const isImage = mimeType?.startsWith("image/") ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${namaFile}`}
      onClick={(e) => { if (e.target === e.currentTarget) onTutup(); }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 truncate">{namaFile}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={fileUrl}
              download={namaFile}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </a>
            <button
              onClick={onTutup}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Tutup preview"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-gray-100 min-h-[300px] flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={namaFile}
              className="w-full h-full min-h-[500px]"
              style={{ border: "none" }}
            />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={namaFile}
              className="max-w-full max-h-[70vh] object-contain p-4"
            />
          ) : (
            <div className="text-center p-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-gray-600 mb-3">Preview tidak tersedia untuk tipe file ini</p>
              <a href={fileUrl} download={namaFile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#009182] text-white text-sm font-medium hover:bg-[#007a6e] transition-colors">
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

interface DocumentUploaderProps {
  leadId?: string;
  bookingId?: string;
  readonly?: boolean;
  /** Label section, default: "Dokumen" */
  title?: string;
}

export default function DocumentUploader({
  leadId, bookingId, readonly = false, title = "Dokumen",
}: DocumentUploaderProps) {
  const { data: session } = useSession();
  const role   = session?.user?.role as UserRole | undefined;
  const userId = session?.user?.id ?? "";

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<DocumentItem | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, startDelete]   = useTransition();
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Edit jenis dokumen
  const [editingDocId, setEditingDocId]     = useState<string | null>(null);
  const [editingJenis, setEditingJenis]     = useState("");
  const [editSaving, startEditSave]         = useTransition();

  // Form upload
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [jenis, setJenis]         = useState("KTP");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch daftar dokumen
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!leadId && !bookingId) return;
    const params = leadId ? `leadId=${leadId}` : `bookingId=${bookingId}`;
    fetch(`/api/documents?${params}`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setDocuments(res.data.documents); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId, bookingId]);

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------
  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];

    // Validasi ukuran di client
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File terlalu besar. Maksimal ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Validasi tipe
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Format tidak didukung. Gunakan PDF, JPG, atau PNG.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { setError("Pilih file terlebih dahulu"); return; }
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("jenisDokumen", jenis);
      if (leadId)    formData.append("leadId", leadId);
      if (bookingId) formData.append("bookingId", bookingId);

      const res  = await fetch("/api/documents", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Gagal mengupload dokumen");
        return;
      }

      setDocuments((prev) => [json.data.document, ...prev]);
      setSelectedFile(null);
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess("Dokumen berhasil diupload");
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setUploading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Hapus
  // ---------------------------------------------------------------------------
  function handleDelete(id: string) {
    startDelete(async () => {
      const res  = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Gagal menghapus dokumen"); setDeleteId(null); return; }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteId(null);
    });
  }

  const canDelete = (doc: DocumentItem) =>
    role ? canDeleteDocument({ id: userId, role }, { uploadedBy: doc.uploader.id }) : false;

  const canUpload = !readonly && role && role !== "SUPER_ADMIN";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {documents.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {documents.length}
            </span>
          )}
        </div>
        {canUpload && !showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#009182] text-xs font-medium text-[#009182] hover:bg-teal-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Dokumen
          </button>
        )}
      </div>

      {/* Alert */}
      {error   && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700" role="alert">{error} <button className="ml-1 underline" onClick={() => setError(null)}>Tutup</button></div>}
      {success && <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700" role="status">{success}</div>}

      {/* Form Upload */}
      {showUploadForm && canUpload && (
        <form onSubmit={handleUpload} className="mb-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Jenis Dokumen <span className="text-red-500">*</span>
            </label>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] disabled:opacity-50"
            >
              {JENIS_DOKUMEN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
              dragOver
                ? "border-[#009182] bg-teal-50"
                : selectedFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
            aria-label="Klik atau seret file ke sini"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={uploading}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="ml-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Hapus file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <>
                <svg className="w-7 h-7 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-600">Klik atau seret file ke sini</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG — maks. {MAX_SIZE_MB} MB</p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              disabled={uploading}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengupload...</>
              ) : "Upload Dokumen"}
            </button>
          </div>
        </form>
      )}

      {/* Daftar dokumen */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-xs text-gray-400">Belum ada dokumen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isPdf   = doc.mimeType === "application/pdf";
            const isImage = doc.mimeType?.startsWith("image/") ?? false;

            return (
              <div key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors group">
                {/* Ikon tipe file */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? "bg-red-100" : isImage ? "bg-blue-100" : "bg-gray-100"}`}>
                  {isPdf ? (
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 18h12a2 2 0 002-2V8l-6-6H4a2 2 0 00-2 2v12a2 2 0 002 2zm8-14l4 4h-4V4zm-2 10H6v-1h4v1zm2-3H6v-1h6v1z"/>
                    </svg>
                  ) : isImage ? (
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>

                {/* Info dokumen */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">
                      {JENIS_LABEL[doc.jenisDokumen] ?? doc.jenisDokumen}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {formatBytes(doc.ukuranBytes)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {doc.namaFile ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.uploader.nama} · {format(new Date(doc.uploadedAt), "d MMM yyyy, HH:mm", { locale: localeId })}
                  </p>
                </div>

                  {/* Aksi */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {/* Edit jenis */}
                  {!readonly && (doc.uploadedBy === userId || role === "ADMIN" || role === "SUPER_ADMIN") && (
                    <button
                      onClick={() => { setEditingDocId(doc.id); setEditingJenis(doc.jenisDokumen); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      aria-label="Ubah jenis dokumen"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                  )}
                  {/* Preview */}
                  {(isPdf || isImage) && (
                    <button
                      onClick={() => setPreview(doc)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#009182] hover:bg-teal-50 transition-colors"
                      aria-label="Preview dokumen"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}

                  {/* Download */}
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    download={doc.namaFile ?? "document"}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    aria-label="Download dokumen"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </a>

                  {/* Hapus */}
                  {canDelete(doc) && !readonly && (
                    <button
                      onClick={() => setDeleteId(doc.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Hapus dokumen"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Preview */}
      {preview && (
        <PreviewModal
          docId={preview.id}
          namaFile={preview.namaFile ?? "document"}
          mimeType={preview.mimeType}
          onTutup={() => setPreview(null)}
        />
      )}

      {/* Modal Edit Jenis Dokumen */}
      {editingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Ubah Jenis Dokumen</h2>
            <select
              value={editingJenis}
              onChange={(e) => setEditingJenis(e.target.value)}
              disabled={editSaving}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#009182] mb-4 disabled:opacity-50"
            >
              {JENIS_DOKUMEN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setEditingDocId(null); setEditingJenis(""); }} disabled={editSaving}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Batal
              </button>
              <button
                onClick={() => {
                  startEditSave(async () => {
                    const res = await fetch(`/api/documents/${editingDocId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ jenisDokumen: editingJenis }),
                    });
                    const json = await res.json();
                    if (res.ok) {
                      setDocuments((prev) => prev.map((d) =>
                        d.id === editingDocId ? { ...d, jenisDokumen: json.data.document.jenisDokumen } : d
                      ));
                      setEditingDocId(null);
                      setEditingJenis("");
                    }
                  });
                }}
                disabled={editSaving}
                className="flex-1 py-2 rounded-lg bg-[#009182] hover:bg-[#007a6e] text-white text-xs font-medium disabled:opacity-50">
                {editSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Hapus Dokumen</h2>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Dokumen ini akan dihapus permanen dari server. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
