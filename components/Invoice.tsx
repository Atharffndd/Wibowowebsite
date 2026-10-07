"use client";

import type { Sale, SaleItem, Settings, Warehouse } from "@/lib/types";
import { num, qty, tanggal } from "@/lib/format";

/** Tampilan nota — mengikuti format nota contoh (cetak A4/A5). TTD + paraf selalu tampil. */
type Row = { key: string; name: string; unit: string; price: number; qty: number; subtotal: number; sources: { wh: string; qty: number }[] };

/** Gabungkan baris barang yang sama (nama, satuan, harga sama) — mis. diambil dari dua gudang.
 *  Dipakai juga oleh Surat Jalan agar daftar barangnya sama persis dengan nota. */
export function mergeRows(items: SaleItem[], sale: Pick<Sale, "warehouse_id"> | null): Row[] {
  const out: Row[] = [];
  const byKey = new Map<string, Row>();
  for (const it of items) {
    const key = `${it.product_id}|${it.name}|${it.unit}|${Number(it.price)}`;
    const wh = it.warehouse_id ?? sale?.warehouse_id ?? "";
    let r = byKey.get(key);
    if (!r) {
      r = { key, name: it.name, unit: it.unit, price: Number(it.price), qty: 0, subtotal: 0, sources: [] };
      byKey.set(key, r);
      out.push(r);
    }
    r.qty += Number(it.qty);
    r.subtotal += Number(it.subtotal);
    const src = r.sources.find((s) => s.wh === wh);
    if (src) src.qty += Number(it.qty);
    else r.sources.push({ wh, qty: Number(it.qty) });
  }
  return out;
}

/**
 * Layout nota khas Tiga Putra — "Opsi B" pilihan pemilik (sederhana, beda dari Wibowo Supplier):
 * kop kiri ("Tiga Putra" biru) + kata NOTA biru & nomor kanan, garis tipis, Kepada / Tanggal,
 * judul tabel berlatar biru sangat muda, TOTAL berlatar biru muda, pembayaran (kiri) & TTD (kanan).
 */
export function Invoice({ sale, items, settings, warehouses = [] }: { sale: Sale; items: SaleItem[]; settings: Settings; warehouses?: Warehouse[] }) {
  const rows = mergeRows(items, sale);
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "";
  const sig = settings.signature_url || "/ttd.webp";
  const showTax = Number(sale.tax_amount) > 0 || Number(sale.tax_percent) > 0;
  const hasExtras = Number(sale.discount) > 0 || Number(sale.shipping) > 0 || showTax;

  return (
    <div className="invoice tp-doc text-[13px] leading-snug">
      {/* Kop */}
      <div className="flex justify-between items-start gap-6">
        <div className="min-w-0">
          <TpName name={settings.company_name} />
          {settings.address && <div className="text-neutral-600 mt-1">{settings.address}</div>}
          {settings.phone && <div className="text-neutral-600">{settings.phone}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="tp-doctitle">NOTA</div>
          <div className="num font-semibold">{sale.number}</div>
          {sale.status === "batal" && <div className="mt-1 inline-block border-2 border-red-600 text-red-600 font-bold px-2 rotate-[-4deg]">BATAL</div>}
        </div>
      </div>

      <div className="tp-meta">
        <div>
          Kepada: <b>{sale.customer_name}</b>
        </div>
        <div className="text-right">
          Tanggal: <b>{tanggal(sale.date)}</b>
        </div>
      </div>

      {/* Tabel barang */}
      <table className="items-table tp-table w-full border-collapse">
        <thead>
          <tr>
            <th className="text-center w-9">No</th>
            <th className="text-left">Nama Barang</th>
            <th className="text-right w-16">Jml</th>
            <th className="text-left w-16">Sat</th>
            <th className="text-right w-28">Harga</th>
            <th className="text-right w-32">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            <tr key={it.key}>
              <td className="text-center num text-neutral-500">{i + 1}</td>
              <td>
                {it.name}
                {/* info gudang hanya untuk internal — tidak ikut dicetak */}
                {warehouses.length > 0 && (
                  <div className="no-print text-[11px] text-brand">
                    {it.sources.map((s) => (it.sources.length > 1 ? `${whName(s.wh)}: ${qty(s.qty)}` : whName(s.wh))).join(" · ")}
                  </div>
                )}
              </td>
              <td className="text-right num">{qty(it.qty)}</td>
              <td>{it.unit}</td>
              <td className="text-right num">{num(it.price)}</td>
              <td className="text-right num">{num(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="pdf-keep flex flex-col items-end mt-2.5">
        {hasExtras && (
          <div className="w-72 px-3.5 space-y-0.5 mb-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="num">{num(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span>Diskon</span>
                <span className="num">-{num(sale.discount)}</span>
              </div>
            )}
            {showTax && (
              <div className="flex justify-between">
                <span>PPN {Number(sale.tax_percent)}%</span>
                <span className="num">{num(sale.tax_amount)}</span>
              </div>
            )}
            {Number(sale.shipping) > 0 && (
              <div className="flex justify-between">
                <span>Ongkir</span>
                <span className="num">{num(sale.shipping)}</span>
              </div>
            )}
          </div>
        )}
        <div className="tp-total">
          <span>TOTAL</span>
          <span className="num">Rp {num(sale.total)}</span>
        </div>
      </div>

      {sale.notes && (
        <div className="mt-3 text-[12px]">
          <b>Catatan:</b> {sale.notes}
        </div>
      )}

      {/* Pembayaran (kiri) + TTD (kanan) */}
      <div className="pdf-keep grid grid-cols-[minmax(0,1fr)_auto] gap-6 mt-6 items-start">
        <div>
          <div className="font-bold">Info Pembayaran</div>
          {settings.account_name && (
            <div className="mt-0.5 mb-1">
              A.N. <b>{settings.account_name}</b>
            </div>
          )}
          <div className="grid grid-cols-[repeat(2,auto)] justify-start gap-x-7 gap-y-0.5">
            {settings.banks.map((b, i) => (
              <div key={i}>
                <b>{b.bank}</b> <span className="num">{b.number}</span>
              </div>
            ))}
          </div>
          {sale.due_date && (
            <div className="mt-1.5 text-[12px]">
              Jatuh tempo: <b>{tanggal(sale.due_date)}</b>
            </div>
          )}
          {settings.footer_note && <div className="mt-1.5 text-[12px]">{settings.footer_note}</div>}
        </div>
        {/* TTD + paraf (wajib di setiap nota) */}
        <div className="text-center w-60">
          <div className="mb-1">Hormat kami,</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sig} alt="Tanda tangan & paraf" className="w-full h-auto max-h-36 object-contain mx-auto" />
        </div>
      </div>
    </div>
  );
}

/** Nama perusahaan di kop: kata pertama-kedua (mis. "Tiga Putra") biru, diikuti "Supplier" */
export function TpName({ name }: { name: string }) {
  return (
    <div className="text-[24px] font-extrabold leading-none tracking-tight">
      <span className="text-[#0a5fe8]">{name}</span> Supplier
    </div>
  );
}
