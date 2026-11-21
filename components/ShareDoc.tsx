"use client";

import { useState, type RefObject } from "react";
import { canShareFile, downloadFile, elementToPdf, printAs } from "@/lib/pdf";
import { Button, Modal } from "./ui";

/**
 * Tombol Cetak / Unduh PDF / WhatsApp untuk Nota & Surat Jalan.
 * WhatsApp: PDF dibuat di browser lalu dibagikan lewat menu Bagikan (iPad/HP) sehingga file ikut terlampir.
 */
export function ShareDoc({
  docRef,
  fileName,
  caption,
  waText,
  summary,
  phone,
  printLabel = "🖨 Cetak",
}: {
  docRef: RefObject<HTMLElement | null>;
  fileName: string;
  /** teks pendek yang menyertai file PDF */
  caption: string;
  /** teks lengkap untuk "Kirim teks saja" / fallback */
  waText: string;
  /**
   * Rangkuman singkat. Di Android, WhatsApp membuang teks yang dikirim bersama file, jadi rangkuman
   * dikirim sebagai pesan kedua (tombol "Kirim rangkuman"). Tanpa ini, perilaku tidak berubah.
   */
  summary?: string;
  phone?: string | null;
  printLabel?: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "wa" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const waLink = (text = waText) => {
    const to = (phone ?? "").replace(/\D/g, "").replace(/^0/, "62");
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  };
  // Android: teks yang menyertai file tidak ikut terkirim → rangkuman dikirim sebagai pesan kedua
  const splitFlow = !!summary && typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Tidak bisa menyalin. Tekan lama pada teks rangkuman lalu pilih Salin.");
    }
  }

  async function makePdf() {
    if (!docRef.current) throw new Error("Dokumen belum siap");
    return elementToPdf(docRef.current, fileName);
  }

  async function onDownload() {
    setBusy("pdf");
    setError(null);
    try {
      downloadFile(await makePdf());
    } catch (e) {
      setError("Gagal membuat PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  }

  async function onWhatsApp() {
    setBusy("wa");
    setError(null);
    setShared(false);
    try {
      setFile(await makePdf());
    } catch (e) {
      setError("Gagal membuat PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    if (!file) return;
    try {
      // Dipanggil langsung dari ketukan tombol (syarat Safari iPad)
      await navigator.share(splitFlow ? { files: [file], title: fileName } : { files: [file], title: fileName, text: caption });
      if (splitFlow) setShared(true);
      else setFile(null);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // dibatalkan pengguna
      setError("Tidak bisa membuka menu Bagikan. Gunakan Unduh PDF lalu lampirkan di WhatsApp.");
    }
  }

  const shareable = file ? canShareFile(file) : false;

  return (
    <>
      <Button onClick={() => printAs(fileName)}>{printLabel}</Button>
      <Button variant="secondary" onClick={onDownload} disabled={busy !== null}>
        {busy === "pdf" ? "Membuat PDF…" : "Unduh PDF"}
      </Button>
      <Button variant="secondary" onClick={onWhatsApp} disabled={busy !== null}>
        {busy === "wa" ? "Menyiapkan PDF…" : "WhatsApp"}
      </Button>
      {error && !file && <span className="basis-full text-sm text-red-600">{error}</span>}

      {file && (
        <Modal open onClose={() => setFile(null)} title="Kirim ke WhatsApp">
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2">
              <span className="text-2xl">📄</span>
              <div className="min-w-0">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted">{Math.max(1, Math.round(file.size / 1024))} KB · PDF siap dikirim</div>
              </div>
            </div>
            {shareable && splitFlow ? (
              <>
                <Button className="w-full py-3 text-base" variant={shared ? "secondary" : "primary"} onClick={share}>
                  {shared ? "✓ PDF dibagikan (bagikan lagi)" : "1. 📤 Bagikan PDF"}
                </Button>
                <p className="text-xs text-muted">Pada menu Bagikan, pilih <b>WhatsApp</b> lalu pilih kontak/grup. File PDF otomatis terlampir.</p>
                <div className="whitespace-pre-line rounded-lg border border-line bg-slate-50 px-3 py-2">{summary}</div>
                <Button className="w-full py-3 text-base" variant={shared ? "primary" : "secondary"} onClick={() => window.open(waLink(summary), "_blank")}>
                  2. 💬 Kirim rangkuman
                </Button>
                <button className="text-brand text-sm hover:underline" onClick={copySummary}>
                  {copied ? "✓ Tersalin" : "Salin rangkuman"}
                </button>
                <p className="text-xs text-muted">Di Android, teks tidak ikut terkirim bersama file, jadi rangkuman dikirim sebagai pesan kedua ke chat yang sama.</p>
              </>
            ) : shareable ? (
              <>
                <Button className="w-full py-3 text-base" onClick={share}>
                  📤 Bagikan PDF
                </Button>
                <p className="text-xs text-muted">Pada menu Bagikan, pilih <b>WhatsApp</b> lalu pilih kontak/grup. File PDF otomatis terlampir.</p>
              </>
            ) : (
              <>
                <p>Browser ini belum bisa membagikan file langsung. Lakukan 2 langkah:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => downloadFile(file)}>
                    1. Unduh PDF
                  </Button>
                  <Button onClick={() => window.open(waLink(), "_blank")}>2. Buka WhatsApp</Button>
                </div>
                <p className="text-xs text-muted">Di WhatsApp, lampirkan file PDF yang baru diunduh (ikon 📎).</p>
              </>
            )}
            <div className="border-t border-line pt-3 flex justify-between items-center">
              <button className="text-brand text-sm hover:underline" onClick={() => window.open(waLink(), "_blank")}>
                Kirim teks saja
              </button>
              <Button variant="ghost" onClick={() => setFile(null)}>
                Tutup
              </Button>
            </div>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}
