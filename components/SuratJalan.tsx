"use client";

import type { Sale, SaleItem, Settings } from "@/lib/types";
import { qty, tanggal } from "@/lib/format";
import { mergeRows } from "./Invoice";

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
      <div className="tp-accent" />

      {/* Kop + kotak Surat Jalan — gaya sama dengan nota Tiga Putra */}
      <div className="flex justify-between items-stretch gap-6 mt-4">
        <div className="min-w-0">
          <div className="tp-brand text-[26px] font-extrabold leading-none mb-1.5">{settings.company_name} Supplier</div>
          {settings.address && <div className="text-neutral-700">{settings.address}</div>}
          {settings.phone && <div className="text-neutral-700">Telp. {settings.phone}</div>}
        </div>
        <div className="tp-box shrink-0 min-w-52 text-right">
          <div className="tp-label">SURAT JALAN</div>
          <div className="num font-bold text-[15px]">{sj.number || "-"}</div>
          <div className="text-neutral-700 mt-1">{tanggal(sj.date)}</div>
          {sj.status === "batal" && <div className="mt-1 inline-block border-2 border-red-600 text-red-600 font-bold px-2 rotate-[-4deg]">BATAL</div>}
        </div>
      </div>

      <div className="tp-to mt-4 mb-3">
        <span className="tp-label mr-2">KEPADA</span>
        <span className="font-semibold text-[14px]">{sj.recipient_name || "-"}</span>
        {sj.recipient_address && <div className="whitespace-pre-line mt-0.5 text-neutral-700">{sj.recipient_address}</div>}
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
            <tr key={it.key} className="align-top">
              <td className="text-center num text-neutral-600">{i + 1}</td>
              <td className="pr-6 text-right">
                <span className="num font-medium">{qty(it.qty)}</span> {it.unit}
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
      <div className="sj-sign grid grid-cols-2 gap-10 mt-6">
        <div className="tp-box text-center">
          <div className="mb-1">Tanda Terima,</div>
          <div className="h-28" />
          <div className="mx-auto w-52 border-t border-neutral-600 pt-1 text-[11px] text-neutral-600">nama &amp; tanda tangan penerima</div>
        </div>
        <div className="tp-box text-center">
          <div className="mb-1">Hormat kami,</div>
          {/* aset TTD + paraf yang sama persis dengan nota */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sig} alt="Tanda tangan & paraf" className="w-60 h-auto max-h-36 object-contain mx-auto" />
        </div>
      </div>
    </div>
  );
}
