-- 0003: (sudah diterapkan) stok per gudang tidak boleh minus.
-- Constraint trigger (deferred) pada stock_movements: setiap mutasi yang MENGURANGI stok
-- (insert qty negatif, atau void mutasi masuk) dicek di akhir transaksi; jika stok gudang < 0 -> ditolak
-- dengan pesan yang menyebut stok di gudang lain.

create or replace function public.fmt_qty_id(v numeric)
returns text language sql immutable as $$
  select case when v = trunc(v) then translate(to_char(v, 'FM999,999,999,990'), ',', '.')
              else replace(trim(trailing '0' from v::text), '.', ',') end;
$$;

create or replace function public.trg_stock_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_qty numeric;
  v_name text; v_unit text; v_wh text; v_other text;
begin
  if tg_op = 'INSERT' then
    if new.void or new.qty_base >= 0 then return null; end if;
  elsif tg_op = 'UPDATE' then
    if not (new.void and not old.void and old.qty_base > 0) then return null; end if;
  end if;

  select coalesce(sum(qty_base), 0) into v_qty from stock_movements
  where product_id = new.product_id and warehouse_id = new.warehouse_id and not void;

  if v_qty < 0 then
    select name, base_unit into v_name, v_unit from products where id = new.product_id;
    select name into v_wh from warehouses where id = new.warehouse_id;
    select string_agg(w.name || ': ' || fmt_qty_id(s.qty) || ' ' || v_unit, ', ')
      into v_other
      from v_stock s join warehouses w on w.id = s.warehouse_id
      where s.product_id = new.product_id and s.warehouse_id <> new.warehouse_id and s.qty > 0;
    raise exception 'Stok "%" di % tidak cukup (kurang % %).%',
      v_name, v_wh, fmt_qty_id(-v_qty), v_unit,
      case when v_other is not null then ' Stok tersedia di ' || v_other || ' — pilih gudang itu atau lakukan Transfer gudang.'
           else ' Catat Barang Masuk / Stok awal dulu.' end;
  end if;
  return null;
end $$;

create constraint trigger stock_nonnegative
after insert or update of void on public.stock_movements
deferrable initially deferred
for each row execute function public.trg_stock_guard();

revoke execute on function public.trg_stock_guard() from public, anon, authenticated;

-- Perbaikan data 2026-10-04: BM/2026/10/0001 (Susu Ultra 125 ML) sempat diubah 150 -> 1000 dus
-- setelah 150 dus terjual. Dikembalikan ke 150 dus @120.000 (Gudang 1-P) dan 1000 dus @117.000
-- dicatat sebagai Barang Masuk baru BM/2026/10/0005 (Gudang 2-R), lewat save_purchase.
