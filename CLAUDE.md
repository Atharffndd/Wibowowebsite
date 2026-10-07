# Nota Tiga Putra

Nama proyek: **Nota Tiga Putra**. Website internal nota, stok & penjualan untuk **Tiga Putra Supplier** (pemasok bahan makanan, pelanggan utama dapur SPPG).
Bahasa tampilan & komunikasi dengan pemilik: **Bahasa Indonesia**. Mata uang Rupiah.

**Baca juga `catatan.md`** — catatan lengkap proyek (persiapan sesi, arsitektur, database, alur kerja, riwayat, masalah terbuka). Perbarui catatan.md setiap ada keputusan/perubahan baru.

## Lokasi & akun
- Live: https://notatigaputra.vercel.app (Vercel project `tiga-putra-website`, deploy otomatis dari branch `main`)
- Repo: github.com/Atharffndd/Wibowowebsite
- Supabase project `tiga-putra` (id `frphemxcondxdbcbnjnh`, region ap-southeast-1, org "Atharffndd", paket free)
- Perubahan database dilakukan lewat Supabase MCP (`apply_migration`) dan dicatat juga di `supabase/migrations/`.

## Data bisnis
- Tiga Putra — Jl. Brigade, Dusun II, Rempoah, Kec. Baturaden — HP 0878-3720-7971
- Rekening A.N. **Muhammad Rizqy**: BCA 3580801659, BNI 1923710765
- Gudang: **Gudang 1-P** dan **Gudang 2-R**. Gudang dipilih **per barang** (default gudang pertama = 1-P) di nota, barang masuk, dan retur; satu barang dari 2 gudang = 2 baris. Jika stok kurang: tetap gudang pilihan + peringatan merah (tidak pindah otomatis). Nota cetak **tidak** menampilkan gudang dan menggabungkan baris yang sama (nama/satuan/harga).
- Nomor nota `INV/YYYY/MM/NNNN` (urut, reset tiap bulan); barang masuk `BM/…`, retur `RJ/…` / `RB/…`
- PPN belum dipakai (tersedia, default mati). HPP: **rata-rata tertimbang**.
- **Satu "Harga jual" per satuan** (tidak ada lagi grosir/eceran; kolom `price_retail` = `price_wholesale` selalu diisi sama). Harga khusus per pelanggan & bisa diubah per nota. Satuan ganda (dus, pcs, kg, …) dengan konversi.
- TTD + paraf (gambar `public/ttd.webp`, bisa diganti di Pengaturan) **wajib tampil di setiap nota**.
- **Surat Jalan** dibuat dari nota (tabel `delivery_notes`, barang selalu dibaca dari nota sumber, tanpa harga; kendaraan Mobil/Pick-up, nomor B 2914 WFK / R 8287 AM / Z 9016 HB; kanan pakai aset TTD yang sama dengan nota). Bisa juga **tanpa nota** (`sale_id` null, barang di `delivery_note_items`, nomor `SJ/YYYY/MM/NNNN`, tidak mengurangi stok). Detail di catatan.md.
- **Ketik baru:** pelanggan/supplier/barang yang belum terdaftar boleh diketik langsung di Nota, Barang Masuk, Retur & Surat Jalan tanpa nota; tersimpan otomatis saat dokumen disimpan (`resolve_new`). Barang baru di nota Tiga Putra otomatis diberi stok awal sejumlah yang dijual (stok tidak boleh minus).
- Format nota (isi mengikuti contoh pemilik): kop "… Supplier", nomor, Kepada, tanggal, tabel No / Nama Barang / Jml / Sat / Harga / Jumlah, TOTAL, Info Pembayaran A.N. + rekening, "Hormat kami," + TTD.
- **Layout khas Tiga Putra** (Okt 2026, sengaja beda dari Wibowo Supplier — jangan disamakan): font Plus Jakarta Sans, garis aksen biru, kotak NOTA/SURAT JALAN (nomor + tanggal) kanan atas, kotak "KEPADA" biru muda, tabel berjudul biru + baris belang, bilah TOTAL biru, Info Pembayaran (kiri) & TTD (kanan) sejajar. CSS kelas `tp-*` di `app/globals.css`.

## Keputusan pemilik (jangan diubah tanpa diminta)
- **Tanpa login sama sekali.** Semua tabel bisa diakses role `anon` (policy `open_all`), `is_staff()` selalu `true`, Vercel SSO protection dimatikan. Pemilik sudah diberi tahu risikonya.
- Tidak ingin mengganti password apa pun.
- Mutasi stok/nota **tidak pernah dihapus**: ubah/batal = tandai `stock_movements.void`, `sale_items.active` / `purchase_items.active = false`, `sales.status = 'batal'`, retur dibatalkan via `void_return`. Semua query item harus memfilter `active = true` dan mutasi `void = false`.
  (Catatan teknis: Supabase MCP menahan fungsi SQL berisi `delete` — tanpa delete juga desain yang lebih baik untuk audit.)
- **Stok per gudang tidak boleh minus**: constraint trigger `stock_nonnegative` (deferred) menolak transaksi yang mengurangi stok gudang di bawah 0 (migrasi 0003). Barang yang datang lagi = Barang Masuk baru, bukan koreksi BM lama.

## Teknis
- Next.js 16 (App Router, semua halaman client component) + Tailwind 4 + `@supabase/supabase-js`, recharts, exceljs.
- Logika transaksi di fungsi Postgres: `save_sale`, `save_purchase`, `cancel_document`, `save_return`, `void_return`, `save_adjustment` (stok awal/opname/transfer), `recompute_avg_cost`, `report_sales`, `dashboard_stats`, `next_doc_number`; UI memanggil versi `save_sale_ex` / `save_purchase_ex` / `save_return_ex` (= `resolve_new` lalu fungsi asli) dan `save_delivery_note`.
- Stok = jumlah `stock_movements` (non-void) per produk per gudang (view `v_stock`, `v_products`).
- Struktur: `app/(app)/*` halaman, `components/` (Invoice.tsx = tampilan nota), `lib/`.
- Cek sebelum push: `npx tsc --noEmit && npm run build`. Sandbox Claude tidak bisa membuka vercel.app/supabase.co langsung; verifikasi DB lewat MCP `execute_sql` dalam transaksi (`begin; set local role anon; …`) tanpa commit.

## Membuat versi untuk perusahaan lain
1. Buat Supabase project baru, jalankan `supabase/migrations/0001_init.sql` lalu `0002_open_access_ledger.sql`, dan pasang ulang fungsi versi terbaru dari database Tiga Putra (ambil definisinya dengan `pg_get_functiondef`).
2. Isi `settings` (nama, alamat, HP, rekening, A.N.), `warehouses`, pelanggan & barang awal.
3. Repo/branch baru dari kode ini, ganti default URL/key di `lib/supabase.ts` dan `.env.example`, ganti `public/ttd.webp`, judul di `app/layout.tsx` & teks "TIGA PUTRA" di `components/Shell.tsx`.
4. Vercel project baru + env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, domain `nota<nama>.vercel.app`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
