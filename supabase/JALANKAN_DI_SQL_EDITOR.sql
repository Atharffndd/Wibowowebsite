-- =====================================================================
-- JALANKAN SEKALI di Supabase Dashboard -> SQL Editor -> New query -> Run
-- (fungsi transaksi nota / barang masuk / batal / hapus retur)
-- Aman dijalankan ulang (create or replace).
-- =====================================================================

create or replace function public.save_sale(p jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_date date := coalesce((p->>'date')::date, current_date);
  v_wh uuid := (p->>'warehouse_id')::uuid;
  v_prefix text;
  it jsonb;
  v_sub numeric := 0;
  v_cogs numeric := 0;
  v_cost numeric;
  v_qty numeric; v_factor numeric; v_price numeric; v_line numeric;
  v_disc numeric := coalesce((p->>'discount')::numeric, 0);
  v_ship numeric := coalesce((p->>'shipping')::numeric, 0);
  v_taxp numeric := coalesce((p->>'tax_percent')::numeric, 0);
  v_tax numeric;
  v_paid numeric := coalesce((p->>'paid_now')::numeric, 0);
begin
  if not is_staff() then raise exception 'Tidak diizinkan'; end if;
  if jsonb_array_length(coalesce(p->'items','[]'::jsonb)) = 0 then
    raise exception 'Nota harus berisi minimal 1 barang';
  end if;

  if v_id is null then
    select invoice_prefix into v_prefix from settings where id = 1;
    insert into sales (number, date, customer_id, customer_name, warehouse_id, due_date, notes)
    values (next_doc_number(coalesce(v_prefix,'INV'), v_date), v_date,
            nullif(p->>'customer_id','')::uuid, coalesce(p->>'customer_name','Umum'),
            v_wh, nullif(p->>'due_date','')::date, p->>'notes')
    returning id into v_id;
  else
    if not exists (select 1 from sales where id = v_id and status = 'aktif') then
      raise exception 'Nota tidak ditemukan atau sudah dibatalkan';
    end if;
    delete from sale_items where sale_id = v_id;
    delete from stock_movements where ref_type = 'sale' and ref_id = v_id;
    update sales set date = v_date, customer_id = nullif(p->>'customer_id','')::uuid,
      customer_name = coalesce(p->>'customer_name','Umum'), warehouse_id = v_wh,
      due_date = nullif(p->>'due_date','')::date, notes = p->>'notes', updated_at = now()
    where id = v_id;
  end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := (it->>'qty')::numeric;
    v_factor := coalesce((it->>'factor')::numeric, 1);
    v_price := (it->>'price')::numeric;
    v_line := round(v_qty * v_price, 2);
    select avg_cost into v_cost from products where id = (it->>'product_id')::uuid;
    insert into sale_items (sale_id, product_id, name, qty, unit, factor, price, subtotal, cost_per_base)
    values (v_id, (it->>'product_id')::uuid, it->>'name', v_qty, it->>'unit', v_factor, v_price, v_line, coalesce(v_cost,0));
    insert into stock_movements (date, product_id, warehouse_id, type, qty_base, unit_price, ref_type, ref_id)
    values (v_date, (it->>'product_id')::uuid, v_wh, 'sale', -(v_qty * v_factor), v_price / v_factor, 'sale', v_id);
    v_sub := v_sub + v_line;
    v_cogs := v_cogs + v_qty * v_factor * coalesce(v_cost, 0);
  end loop;

  v_tax := round((v_sub - v_disc) * v_taxp / 100, 0);
  update sales set subtotal = v_sub, discount = v_disc, shipping = v_ship, tax_percent = v_taxp,
    tax_amount = v_tax, total = v_sub - v_disc + v_tax + v_ship, cogs = round(v_cogs, 2)
  where id = v_id;

  if v_paid > 0 then
    insert into payments (kind, sale_id, date, amount, method)
    values ('sale', v_id, v_date, v_paid, coalesce(p->>'payment_method','tunai'));
  end if;
  return v_id;
end $$;

create or replace function public.save_purchase(p jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_date date := coalesce((p->>'date')::date, current_date);
  v_wh uuid := (p->>'warehouse_id')::uuid;
  it jsonb;
  v_sub numeric := 0;
  v_qty numeric; v_factor numeric; v_price numeric; v_line numeric;
  v_disc numeric := coalesce((p->>'discount')::numeric, 0);
  v_ship numeric := coalesce((p->>'shipping')::numeric, 0);
  v_paid numeric := coalesce((p->>'paid_now')::numeric, 0);
  v_products uuid[] := '{}';
  v_old uuid[];
  pid uuid;
begin
  if not is_staff() then raise exception 'Tidak diizinkan'; end if;
  if jsonb_array_length(coalesce(p->'items','[]'::jsonb)) = 0 then
    raise exception 'Minimal 1 barang';
  end if;

  if v_id is null then
    insert into purchases (number, date, supplier_id, supplier_name, supplier_ref, warehouse_id, due_date, notes)
    values (next_doc_number('BM', v_date), v_date, nullif(p->>'supplier_id','')::uuid, p->>'supplier_name',
            p->>'supplier_ref', v_wh, nullif(p->>'due_date','')::date, p->>'notes')
    returning id into v_id;
  else
    if not exists (select 1 from purchases where id = v_id and status = 'aktif') then
      raise exception 'Data tidak ditemukan atau sudah dibatalkan';
    end if;
    select array_agg(distinct product_id) into v_old from purchase_items where purchase_id = v_id;
    v_products := coalesce(v_old, '{}');
    delete from purchase_items where purchase_id = v_id;
    delete from stock_movements where ref_type = 'purchase' and ref_id = v_id;
    update purchases set date = v_date, supplier_id = nullif(p->>'supplier_id','')::uuid,
      supplier_name = p->>'supplier_name', supplier_ref = p->>'supplier_ref', warehouse_id = v_wh,
      due_date = nullif(p->>'due_date','')::date, notes = p->>'notes'
    where id = v_id;
  end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := (it->>'qty')::numeric;
    v_factor := coalesce((it->>'factor')::numeric, 1);
    v_price := (it->>'price')::numeric;
    v_line := round(v_qty * v_price, 2);
    insert into purchase_items (purchase_id, product_id, name, qty, unit, factor, price, subtotal)
    values (v_id, (it->>'product_id')::uuid, it->>'name', v_qty, it->>'unit', v_factor, v_price, v_line);
    insert into stock_movements (date, product_id, warehouse_id, type, qty_base, unit_cost, ref_type, ref_id)
    values (v_date, (it->>'product_id')::uuid, v_wh, 'purchase', v_qty * v_factor, v_price / v_factor, 'purchase', v_id);
    v_sub := v_sub + v_line;
    v_products := array_append(v_products, (it->>'product_id')::uuid);
  end loop;

  update purchases set subtotal = v_sub, discount = v_disc, shipping = v_ship,
    total = v_sub - v_disc + v_ship where id = v_id;

  foreach pid in array (select array_agg(distinct x) from unnest(v_products) x) loop
    perform recompute_avg_cost(pid);
  end loop;

  if v_paid > 0 then
    insert into payments (kind, purchase_id, date, amount, method)
    values ('purchase', v_id, v_date, v_paid, coalesce(p->>'payment_method','tunai'));
  end if;
  return v_id;
end $$;

create or replace function public.cancel_document(p_kind text, p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare pid uuid;
begin
  if not is_staff() then raise exception 'Tidak diizinkan'; end if;
  if p_kind = 'sale' then
    update sales set status = 'batal', updated_at = now() where id = p_id;
    delete from stock_movements where ref_type = 'sale' and ref_id = p_id;
  elsif p_kind = 'purchase' then
    update purchases set status = 'batal' where id = p_id;
    delete from stock_movements where ref_type = 'purchase' and ref_id = p_id;
    for pid in select distinct product_id from purchase_items where purchase_id = p_id loop
      perform recompute_avg_cost(pid);
    end loop;
  else
    raise exception 'Jenis tidak dikenal';
  end if;
end $$;

create or replace function public.delete_return(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare r public.returns%rowtype;
begin
  if not is_staff() then raise exception 'Tidak diizinkan'; end if;
  select * into r from returns where id = p_id;
  if r.sale_id is not null then
    update sales set return_amount = greatest(return_amount - r.total, 0) where id = r.sale_id;
  end if;
  if r.purchase_id is not null then
    update purchases set return_amount = greatest(return_amount - r.total, 0) where id = r.purchase_id;
  end if;
  delete from stock_movements where ref_type = 'return' and ref_id = p_id;
  delete from returns where id = p_id;
end $$;

revoke execute on function public.save_sale(jsonb) from public, anon;
revoke execute on function public.save_purchase(jsonb) from public, anon;
revoke execute on function public.cancel_document(text, uuid) from public, anon;
revoke execute on function public.delete_return(uuid) from public, anon;

-- bersihkan fungsi uji coba
drop function if exists public.tmp_probe(uuid);

select 'OK - fungsi transaksi terpasang' as status;

-- Jadikan semua akun yang sudah dibuat di Authentication -> Users sebagai staff
-- (jalankan SETELAH membuat akun login pertama Anda)
insert into public.staff (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

select email as staff_terdaftar from public.staff;
