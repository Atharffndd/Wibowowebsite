"use client";

import { useMemo, useRef, useState } from "react";
import type { LineItem, Product } from "@/lib/types";
import { num, qty as fq, rp } from "@/lib/format";
import { Button, NumInput, Select, cx } from "./ui";

type PriceFn = (p: Product, unit: string) => Promise<number> | number;

export function newKey() {
  return Math.random().toString(36).slice(2);
}

/** Pencarian barang dengan keyboard (ketik nama / kode, Enter untuk pilih) */
export function ProductSearch({ products, onPick, placeholder = "Cari & tambah barang… (ketik nama / kode)" }: { products: Product[]; onPick: (p: Product) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 30);
    const words = s.split(/\s+/);
    return products.filter((p) => words.every((w) => p.name.toLowerCase().includes(w) || (p.sku ?? "").toLowerCase().includes(w))).slice(0, 30);
  }, [q, products]);

  function pick(p: Product) {
    onPick(p);
    setQ("");
    setHi(0);
    ref.current?.focus();
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[hi]) pick(results[hi]);
          }
        }}
        className="w-full rounded-lg border border-brand/40 bg-brand-soft/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
          {results.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setHi(i)}
              className={cx("w-full text-left px-3 py-2 text-sm flex justify-between gap-3", i === hi && "bg-brand-soft")}
            >
              <span>
                {p.name} {p.sku && <span className="text-muted text-xs">· {p.sku}</span>}
              </span>
              <span className="text-xs text-muted whitespace-nowrap">
                stok {fq(p.stock_total)} {p.base_unit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ItemsEditor({
  items,
  setItems,
  products,
  priceFor,
  stock,
  priceLabel = "Harga",
  hint,
}: {
  items: LineItem[];
  setItems: (f: (items: LineItem[]) => LineItem[]) => void;
  products: Product[];
  priceFor: PriceFn;
  stock?: Record<string, number>;
  priceLabel?: string;
  hint?: (it: LineItem) => React.ReactNode;
}) {
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  async function add(p: Product) {
    const unit = p.base_unit;
    const u = p.product_units?.find((x) => x.unit === unit);
    const price = await priceFor(p, unit);
    setItems((its) => [...its, { key: newKey(), product_id: p.id, name: p.name, unit, factor: Number(u?.factor ?? 1), qty: 1, price }]);
  }

  async function changeUnit(it: LineItem, unit: string) {
    const p = byId[it.product_id];
    const u = p?.product_units?.find((x) => x.unit === unit);
    const price = p ? await priceFor(p, unit) : it.price;
    setItems((its) => its.map((x) => (x.key === it.key ? { ...x, unit, factor: Number(u?.factor ?? 1), price } : x)));
  }

  const update = (key: string, patch: Partial<LineItem>) => setItems((its) => its.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-3">
      <ProductSearch products={products} onPick={add} />
      {items.length > 0 && (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>Nama barang</th>
                <th className="w-28 text-right">Jumlah</th>
                <th className="w-28">Satuan</th>
                <th className="w-36 text-right">{priceLabel}</th>
                <th className="w-36 text-right">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const p = byId[it.product_id];
                const units = p?.product_units?.length ? p.product_units : [{ unit: it.unit, factor: it.factor }];
                const avail = stock ? stock[it.product_id] ?? 0 : undefined;
                const need = it.qty * it.factor;
                return (
                  <tr key={it.key}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <input
                        value={it.name}
                        onChange={(e) => update(it.key, { name: e.target.value })}
                        className="w-full min-w-40 bg-transparent border-b border-transparent focus:border-brand focus:outline-none"
                      />
                      <div className="text-xs text-muted flex flex-wrap gap-x-3">
                        {avail !== undefined && (
                          <span className={cx(need > avail && "text-red-600 font-medium")}>
                            stok gudang: {fq(avail)} {p?.base_unit}
                            {need > avail && " (kurang)"}
                          </span>
                        )}
                        {it.factor !== 1 && (
                          <span>
                            = {fq(need)} {p?.base_unit}
                          </span>
                        )}
                        {hint?.(it)}
                      </div>
                    </td>
                    <td>
                      <NumInput value={it.qty} onChange={(n) => update(it.key, { qty: n })} className="py-1.5" />
                    </td>
                    <td>
                      <Select value={it.unit} onChange={(e) => changeUnit(it, e.target.value)} className="py-1.5">
                        {units.map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <NumInput value={it.price} onChange={(n) => update(it.key, { price: n })} className="py-1.5" />
                    </td>
                    <td className="num font-medium">{num(it.qty * it.price)}</td>
                    <td>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setItems((its) => its.filter((x) => x.key !== it.key))} aria-label="Hapus">
                        ✕
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {items.length === 0 && <div className="text-sm text-muted text-center py-6 border border-dashed border-line rounded-lg">Belum ada barang. Cari barang di atas untuk menambahkan.</div>}
    </div>
  );
}

export const itemsSubtotal = (items: LineItem[]) => items.reduce((s, it) => s + Math.round(it.qty * it.price * 100) / 100, 0);
export const itemsPayload = (items: LineItem[]) =>
  items.filter((it) => it.qty > 0).map(({ product_id, name, qty, unit, factor, price }) => ({ product_id, name, qty, unit, factor, price }));
export { rp };
