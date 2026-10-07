"use client";

import type { Sale, SaleItem, Settings } from "@/lib/types";
import { qty, tanggal } from "@/lib/format";
import { TpName, mergeRows } from "./Invoice";

export type SuratJalanData = {
  number: string;
  date: string;
  recipient_name: string;
  recipient_address: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  notes: string | null;
  status?: "aktif" | "batal";
};

/**
 * Dokumen Surat Jalan — kop, font & gaya khas Tiga Putra, sama dengan nota (Invoice.tsx).
 * Barang diambil dari nota sumber (urutan, jumlah, satuan, nama sama persis; tanpa harga),
 * atau dari daftar barang Surat Jalan sendiri jika dibuat tanpa nota (sale = null).
 * TTD/cap kanan memakai aset yang sama dengan nota.
 */
export function SuratJalan({ sj, sale, items, settings }: { sj: SuratJalanData; sale: Sale | null; items: SaleItem[]; settings: Settings }) {
  const rows = mergeRows(items, sale);
  const sig = settings.signature_url || "/ttd.webp";
  const vehicle = [sj.vehicle_type, sj.vehicle_number].filter(Boolean);

  return (
    <div className="invoice tp-doc surat-jalan text-[13px] leading-snug">
      {/* Kop — gaya sama dengan nota Tiga Putra (Opsi B) */}
      <div className="flex justify-between items-start gap-6">
        <div className="min-w-0">
          <TpName name={settings.company_name} />
          {settings.address && <div className="text-neutral-600 mt-1">{settings.address}</div>}
          {settings.phone && <div className="text-neutral-600">{settings.phone}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="tp-doctitle">SURAT JALAN</div>
          <div className="num font-semibold">{sj.number || "-"}</div>
          {sj.status === "batal" && <div className="mt-1 inline-block border-2 border-red-600 text-red-600 font-bold px-2 rotate-[-4deg]">BATAL</div>}
        </div>
      </div>

      <div className="tp-meta">
        <div className="min-w-0">
          Kepada: <b>{sj.recipient_name || "-"}</b>
          {sj.recipient_address && <div className="whitespace-pre-line text-neutral-600">{sj.recipient_address}</div>}
        </div>
        <div className="text-right shrink-0">
          Tanggal: <b>{tanggal(sj.date)}</b>
        </div>
      </div>

      <div className="mb-3">
        Kami kirimkan barang-barang tersebut di bawah ini. Dikirim dengan kendaraan{vehicle.length ? "" : ":"}{" "}
        {sj.vehicle_type && <b>{sj.vehicle_type}</b>}
        {sj.vehicle_number && (
          <>
            {" "}
            dengan nomor: <b className="num whitespace-nowrap">{sj.vehicle_number}</b>
          </>
        )}
        {!vehicle.length && <span className="inline-block w-48 border-b border-dotted border-neutral-500" />}
      </div>

      {/* Tabel barang — header berulang di tiap halaman cetak */}
      <table className="sj-table items-table tp-table w-full border-collapse">
        <thead>
          <tr>
            <th className="text-center w-12">No</th>
            <th className="text-right pr-6 w-44">Banyak Barang</th>
            <th className="text-left">Nama Barang</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            <tr key={it.key}>
              <td className="text-center num text-neutral-500">{i + 1}</td>
              <td className="pr-6 text-right">
                <span className="num">{qty(it.qty)}</span> {it.unit}
              </td>
              <td>{it.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sj.notes && (
        <div className="mt-3 text-[12px]">
          <b>Catatan:</b> {sj.notes}
        </div>
      )}

      {/* Tanda tangan — tidak terpotong antar halaman */}
      <div className="sj-sign grid grid-cols-2 gap-10 mt-7">
        <div className="text-center">
          <div className="mb-1">Tanda Terima,</div>
          <div className="h-28" />
          <div className="mx-auto w-52 border-t border-neutral-500 pt-1 text-[11px] text-neutral-500">nama &amp; tanda tangan penerima</div>
        </div>
        <div className="text-center">
          <div className="mb-1">Hormat kami,</div>
          {/* aset TTD + paraf yang sama persis dengan nota */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sig} alt="Tanda tangan & paraf" className="w-60 h-auto max-h-36 object-contain mx-auto" />
        </div>
      </div>
    </div>
  );
}
