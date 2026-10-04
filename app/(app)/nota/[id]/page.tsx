"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useAsync } from "@/lib/hooks";
import { num, rp, tanggal } from "@/lib/format";
import { balance, type Sale, type SaleItem } from "@/lib/types";
import { useApp } from "@/components/AppContext";
import { Invoice } from "@/components/Invoice";
import { PaymentList, PaymentModal, type Payment } from "@/components/Payments";
import { payStatus } from "@/components/status";
import { Button, Card, ErrorBox, Loading } from "@/components/ui";

export default function NotaDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { settings, warehouses } = useApp();
  const [payOpen, setPayOpen] = useState(false);

  const { data, error, loading, reload } = useAsync(async () => {
    const [s, it, pay, cust] = await Promise.all([
      sb().from("sales").select("*").eq("id", id).single(),
      sb().from("sale_items").select("*").eq("sale_id", id).eq("active", true).order("id"),
      sb().from("payments").select("*").eq("sale_id", id).order("date"),
      sb().from("sales").select("customers(phone)").eq("id", id).single(),
    ]);
    if (s.error) throw s.error;
    const items = ((it.data as SaleItem[]) ?? []).slice();
    return {
      sale: s.data as Sale,
      items,
      payments: (pay.data as Payment[]) ?? [],
      phone: ((cust.data as unknown as { customers: { phone: string | null } | null })?.customers?.phone ?? "") as string,
    };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox error={error ?? "Nota tidak ditemukan"} />;
  const { sale, items, payments, phone } = data;
  const remaining = balance(sale);

  async function cancel() {
    if (!confirm(`Batalkan nota ${sale.number}? Stok akan dikembalikan.`)) return;
    const { error } = await sb().rpc("cancel_document", { p_kind: "sale", p_id: sale.id });
    if (error) alert(error.message);
    else reload();
  }

  function shareWA() {
    const lines = [
      `*${settings.company_name} Supplier*`,
      `Nota: ${sale.number}`,
      `Tanggal: ${tanggal(sale.date)}`,
      `Kepada: ${sale.customer_name}`,
      "",
      ...items.map((it, i) => `${i + 1}. ${it.name} — ${num(it.qty)} ${it.unit} x ${num(it.price)} = ${num(it.subtotal)}`),
      "",
      `*TOTAL: ${rp(sale.total)}*`,
      remaining > 0 && Number(sale.paid_amount) > 0 ? `Sisa tagihan: ${rp(remaining)}` : null,
      "",
      `Pembayaran${settings.account_name ? " a.n. " + settings.account_name : ""}:`,
      ...settings.banks.map((b) => `${b.bank} ${b.number}`),
    ].filter((l): l is string => l !== null);
    const to = phone.replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <Link href="/nota" className="text-sm text-brand hover:underline">
            ‹ Daftar nota
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-bold font-mono">{sale.number}</h1>
            {payStatus(sale)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>🖨 Cetak / PDF</Button>
          <Button variant="secondary" onClick={shareWA}>
            WhatsApp
          </Button>
          {sale.status === "aktif" && (
            <>
              <Button variant="secondary" onClick={() => router.push(`/nota/baru?id=${sale.id}`)}>
                Ubah
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/retur?sale=${sale.id}`)}>
                Retur
              </Button>
              <Button variant="danger" onClick={cancel}>
                Batalkan
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="print-area bg-white border border-line rounded-xl p-6 md:p-10 max-w-[210mm] shadow-sm overflow-x-auto">
          <Invoice sale={sale} items={items} settings={settings} warehouses={warehouses} />
        </div>

        <div className="no-print space-y-4">
          <Card title="Pembayaran" actions={sale.status === "aktif" && remaining > 0 && <Button size="sm" onClick={() => setPayOpen(true)}>+ Bayar</Button>}>
            <div className="text-sm space-y-1 mb-3">
              <Line label="Total" value={rp(sale.total)} />
              {Number(sale.return_amount) > 0 && <Line label="Retur" value={"-" + rp(sale.return_amount)} />}
              <Line label="Dibayar" value={rp(sale.paid_amount)} />
              <Line label="Sisa" value={rp(Math.max(remaining, 0))} bold />
              {sale.due_date && <Line label="Jatuh tempo" value={tanggal(sale.due_date)} />}
            </div>
            <PaymentList payments={payments} onDeleted={reload} />
          </Card>
          <Card title="Laba nota ini">
            <div className="text-sm space-y-1">
              <Line label="Penjualan (setelah diskon)" value={rp(Number(sale.subtotal) - Number(sale.discount))} />
              <Line label="HPP (modal)" value={rp(sale.cogs)} />
              <Line label="Laba kotor" value={rp(Number(sale.subtotal) - Number(sale.discount) - Number(sale.cogs))} bold />
            </div>
          </Card>
        </div>
      </div>

      {payOpen && (
        <PaymentModal open onClose={() => setPayOpen(false)} kind="sale" docId={sale.id} docLabel={sale.number} remaining={remaining} onSaved={reload} />
      )}
    </>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "font-semibold" : "")}>
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
