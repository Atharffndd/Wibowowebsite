# Catatan Lengkap — Nota Tiga Putra

> Dokumen ini adalah "ingatan" proyek. Claude: baca seluruhnya sebelum mengubah apa pun.
> Pemilik: simpan, dan bila memulai sesi baru cukup tulis *"Baca catatan.md, lalu …"*.
> Bahasa komunikasi dengan pemilik: **Bahasa Indonesia**, singkat, tanpa istilah teknis berlebihan.

---

## 1. Ringkasan

**Nota Tiga Putra** adalah website internal untuk **Tiga Putra Supplier** (pemasok bahan makanan; pelanggan utama dapur **SPPG**). Fungsinya:

- Nota penjualan (cetak/PDF/WhatsApp) dengan TTD + paraf
- Surat Jalan dari nota (cetak/PDF/WhatsApp), barang otomatis sama dengan nota, tanpa harga
- Barang & harga (multi satuan, satu harga jual per satuan, harga khusus pelanggan)
- Stok 2 gudang (Gudang 1-P, Gudang 2-R), barang masuk/keluar, opname, transfer
- Pelanggan, supplier, piutang, hutang, retur, biaya operasional
- Laporan penjualan, HPP, laba (per hari/bulan/barang/kategori/pelanggan/gudang) + export Excel

| Hal | Nilai |
|---|---|
| Website live | https://notatigaputra.vercel.app |
| Repo GitHub | https://github.com/Atharffndd/Wibowowebsite (branch produksi: `main`) |
| Branch kerja Claude | `claude/gracious-dirac-qc0fiz` (atau branch yang ditentukan sesi) |
| Supabase | project `tiga-putra`, id `frphemxcondxdbcbnjnh`, region `ap-southeast-1`, org "Atharffndd", paket free |
| Supabase URL | `https://frphemxcondxdbcbnjnh.supabase.co` |
| Publishable key | `sb_publishable_KjYFYKNtMJ9N3JdjmkASMg_Y1udWy51` (aman di browser) |
| Vercel | project `tiga-putra-website` (id `prj_F2aG9XsplGoN59zAIQBhbdr1pWI9`, team `team_a7kAr4EFLnLEUjjjybKDqEeR`), auto-deploy dari `main` |
| Domain | `notatigaputra.vercel.app` (juga `tiga-putra-website.vercel.app`) |

---

## 2. Data bisnis

- **Nama di kop nota:** "Tiga Putra Supplier"
- **Alamat:** Jl. Brigade, Dusun II, Rempoah, Kec. Baturaden
- **HP:** 0878-3720-7971
- **Rekening A.N. Muhammad Rizqy:** BCA 3580801659 · BNI 1923710765
- **Gudang:** Gudang 1-P (kode `1-P`, default) dan Gudang 2-R (kode `2-R`). Gudang default = kode terkecil.
- **Penomoran:** nota `INV/YYYY/MM/NNNN`, barang masuk `BM/…`, retur penjualan `RJ/…`, retur pembelian `RB/…`. Nomor urut **reset tiap bulan** (tabel `doc_counters`).
- **PPN:** belum dipakai (fitur tersedia, default mati).
- **HPP:** rata-rata tertimbang (moving average), dihitung ulang dari seluruh mutasi.
- **Harga:** satu **Harga jual** per satuan (opsi grosir/eceran dihapus Okt 2026; nilai lama diambil dari harga grosir). Urutan harga otomatis di nota: harga khusus pelanggan → harga jual. Ada petunjuk "harga terakhir" ke pelanggan itu.
- **Satuan ganda:** dus, pcs, kg, dll. dengan konversi ke satuan dasar (`factor`).
- **Pelanggan awal:** 10 dapur SPPG (dari Excel pemilik; kolom di Excel berjudul "Supplier" tetapi isinya pelanggan).
- **TTD + paraf:** `public/ttd.webp` (logo TP + tanda tangan), bisa diganti di menu Pengaturan (disimpan ke Storage bucket `branding`). **Wajib tampil di setiap nota.**

### Surat Jalan
- Dibuat dari nota: detail nota → **🚛 Buat Surat Jalan** (juga muncul setelah nota disimpan, `?saved=1`). Menu sendiri: **Surat Jalan**.
- Tabel `delivery_notes` (sale_id, number, date, recipient_name, recipient_address, vehicle_type, vehicle_number, notes, status). Barang **tidak disalin**: selalu dibaca dari item aktif nota sumber lewat `mergeRows` (urutan/jumlah/satuan/nama sama persis dengan nota cetak).
- Default: nomor = nomor nota (bisa diubah), tanggal = tanggal nota, penerima = nama di nota, alamat = alamat pelanggan.
- Kendaraan: jenis `Mobil` / `Pick-up`; nomor `B 2914 WFK`, `R 8287 AM`, `Z 9016 HB` (konstanta di `lib/types.ts`).
- Dokumen: kop sama dengan nota, judul **SURAT JALAN** + NOMOR, "Kepada" + alamat, tanggal, kalimat kendaraan, tabel `NO. | BANYAK BARANG | NAMA BARANG` (tanpa harga/total), tanda tangan kiri **Tanda Terima** (kosong) & kanan **Hormat kami** + aset TTD yang sama dengan nota.
- Cetak lewat dialog cetak; **Unduh PDF** & **WhatsApp** membuat PDF A4 langsung di browser (`lib/pdf.ts`, html-to-image + jspdf) dengan judul tabel berulang & tanda tangan tidak terpotong. WhatsApp = menu Bagikan (Web Share API, harus dari ketukan tombol → dialog 2 langkah di `components/ShareDoc.tsx`) sehingga PDF terlampir; cadangan: Unduh PDF + buka wa.me.
- Batal = `status = 'batal'` (tidak dihapus). Kode: `components/SuratJalan.tsx`, `lib/suratJalan.ts`, `app/(app)/surat-jalan/*`.

### Format nota (mengikuti contoh pemilik)
Kop "… Supplier" + alamat + HP · `NOMOR` di kanan atas · garis tebal · "Kepada: …" + tanggal (format "2 Oktober 2026") · tabel `# | NAMA BARANG | JML | SAT | HARGA | JUMLAH` · `TOTAL Rp …` · "Info Pembayaran A.N. …" + grid rekening · "Hormat kami," + gambar TTD.
- Nota cetak **tidak** menampilkan gudang.
- Baris barang yang sama (produk, nama, satuan, harga sama) **digabung** di nota.
- Di layar (bukan cetak) di bawah nama barang ada info gudang kecil (class `no-print`).

---

## 3. Keputusan pemilik (JANGAN diubah tanpa diminta)

1. **Tanpa login sama sekali.** Semua halaman langsung terbuka. Database: semua tabel punya policy `open_all` untuk role `anon` + `authenticated`; `is_staff()` selalu `true`; proteksi Vercel (SSO) dimatikan. Pemilik sudah diberi tahu risikonya (siapa pun yang tahu URL bisa membaca/mengubah data).
2. **Tidak ingin mengganti password apa pun.** Jangan minta, jangan simpan password.
3. **Data tidak pernah dihapus** (jejak audit):
   - Ubah nota/barang masuk → item lama `active = false`, mutasi lama `void = true`, lalu item & mutasi baru dibuat.
   - Batal → `status = 'batal'` + mutasi `void = true`.
   - Retur dibatalkan lewat `void_return` (status `batal`).
   - **Semua query item wajib filter `active = true`; semua query mutasi wajib filter `void = false`.**
4. **Stok per gudang tidak boleh minus.** Trigger `stock_nonnegative` menolak transaksi apa pun yang membuat stok gudang < 0, dengan pesan yang menyebut stok di gudang lain.
5. **Barang datang lagi = Barang Masuk BARU**, bukan "Koreksi data" pada BM lama (koreksi mengganti jumlah, bukan menambah). Tombol di UI: "+ Barang masuk baru" dan "Koreksi data" (dengan peringatan).
6. **Gudang dipilih per barang** (nota, barang masuk, retur). Default Gudang 1-P. Jika stok kurang: **tetap** gudang pilihan + peringatan merah (TIDAK pindah otomatis). Satu barang dari dua gudang = tambah dua baris.
7. Website versi perusahaan lain **terpisah total** (Supabase & Vercel sendiri).

---

## 4. Persiapan untuk sesi baru (checklist pemilik)

### Akun
- **Claude** (paket dengan Claude Code) — buka https://claude.ai/code
- **GitHub** — pemilik repo `Atharffndd/Wibowowebsite`
- **Supabase** — org "Atharffndd" (email athaberdikari@gmail.com)
- **Vercel** — akun `athaberdikari-1355`

### Connector di claude.ai (Settings → Connectors)
- **GitHub** (baca/ubah kode, PR, merge)
- **Supabase** (ubah database)
- **Vercel** (cek deploy, domain, environment variable)

### Opsional (agar Claude bisa mengecek website sendiri)
Environment sesi → **Edit** → **Network access** → **Custom**, tambahkan domain `notatigaputra.vercel.app` dan `frphemxcondxdbcbnjnh.supabase.co` (pertahankan daftar default). Panduan: https://code.claude.com/docs/en/cloud-environments#network-access

### Memulai
1. Buka claude.ai/code → pilih repo **Atharffndd/Wibowowebsite**.
2. Kalimat pembuka yang disarankan:
   > Baca catatan.md dan CLAUDE.md. Lalu: [permintaan]. Tanya dulu jika ada yang kurang jelas, setelah itu langsung deploy.

### Contoh prompt
- **Revisi:** "Revisi Nota Tiga Putra: tambahkan kolom diskon per barang di nota. Tanya dulu, lalu deploy."
- **Bug:** "Bug: saya buat nota INV/2026/10/0012 Susu Ultra 50 dus dari Gudang 1-P, stok harusnya 350 tapi tampil 300. Perbaiki lalu deploy." (sebut nomor dokumen / nama barang, lampirkan screenshot)
- **Perusahaan baru:** "Buat website seperti Nota Tiga Putra untuk perusahaan [nama]. Ikuti bagian 10 di catatan.md. Data terlampir."

### Data yang disiapkan untuk perusahaan baru
Nama perusahaan · alamat · HP · rekening + A.N. · daftar gudang (nama & kode) · gambar TTD/cap (PNG transparan lebih baik) · contoh nota lama (foto) · Excel barang (Nama Barang, Satuan, Harga Eceran, Harga Grosir, Kategori, stok awal) · Excel pelanggan & supplier · nama domain yang diinginkan (`nota<nama>.vercel.app`) · keputusan: login atau tidak, PPN, format nomor.

---

## 5. Arsitektur teknis

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Semua halaman *client component* (`"use client"`) yang memanggil Supabase langsung dari browser.
- **Library:** `@supabase/supabase-js`, `recharts` (grafik), `exceljs` (import/export Excel).
- **Backend:** Supabase Postgres. Logika transaksi ada di **fungsi Postgres (RPC)** agar atomik.
- **Hosting:** Vercel (auto-deploy dari `main`). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (juga ada default di `lib/supabase.ts`).

### Struktur folder
```
app/
  layout.tsx            root (font Inter + JetBrains Mono)
  globals.css           tema (warna brand #0a5fe8), gaya tabel, CSS cetak (@media print, .no-print)
  login/page.tsx        redirect ke "/" (tidak ada login)
  (app)/layout.tsx      Shell (sidebar menu)
  (app)/page.tsx        Dashboard
  (app)/nota/           daftar, baru (?id= untuk ubah), [id] (detail/cetak/bayar/WA/batal)
  (app)/barang-masuk/   daftar, baru (?id= = koreksi), [id]
  (app)/retur/          daftar + modal (?sale= / ?purchase= untuk retur dari dokumen)
  (app)/barang/         daftar + modal edit + import/export Excel, [id] (stok, mutasi, riwayat harga)
  (app)/stok/           posisi stok per gudang, riwayat mutasi, stok awal/opname/transfer
  (app)/pelanggan/      daftar, [id] (riwayat, harga khusus)
  (app)/supplier/       daftar + riwayat pembelian
  (app)/piutang, hutang (komponen Outstanding), biaya, laporan, pengaturan
components/
  Shell.tsx             sidebar + AppProvider
  AppContext.tsx        settings + warehouses global (useApp())
  ItemsEditor.tsx       tabel input barang (gudang per baris, stok semua gudang, ProductSearch, addBack, itemsPayload)
  Invoice.tsx           tampilan nota (cetak) + gabung baris
  Payments.tsx, Outstanding.tsx, status.tsx, CustomerModal.tsx, BarChartRp.tsx, ui.tsx
lib/
  supabase.ts           client + fetchAll (lewati limit 1000 baris)
  hooks.ts              useAsync, loadProducts/Customers/Suppliers, loadStockAll
  types.ts, format.ts (rp, tanggal Indonesia), excel.ts
supabase/migrations/    0001_init → 0004_item_warehouse (catatan; perubahan diterapkan lewat MCP)
public/ttd.webp         TTD + paraf bawaan
```

### Tabel database (schema `public`)
| Tabel | Isi penting |
|---|---|
| `settings` (1 baris, id=1) | company_name, address, phone, account_name, banks (jsonb `[{bank,number}]`), invoice_prefix, tax_enabled, tax_percent, footer_note, signature_url |
| `warehouses` | code, name, active |
| `categories` | name |
| `products` | sku, name, category_id, base_unit, **avg_cost** (HPP/satuan dasar), min_stock, active |
| `product_units` | product_id, unit, factor, price_retail, price_wholesale (trigger → `price_history`) |
| `customers` | name, price_type (tidak dipakai lagi, selalu grosir), phone, address, term_days |
| `customer_prices` | harga khusus per pelanggan/produk/satuan |
| `suppliers` | name, contact, phone, address, bank_info |
| `sales` / `sale_items` | header nota / item (`warehouse_id`, `cost_per_base` = HPP saat transaksi, `active`) |
| `purchases` / `purchase_items` | barang masuk / item (`warehouse_id`, `active`) |
| `returns` / `return_items` | retur (kind sale/purchase, `status`, item `warehouse_id`) |
| `payments` | pembayaran nota/barang masuk (trigger sinkron `paid_amount`) |
| `expenses` | biaya operasional |
| `stock_movements` | **sumber kebenaran stok**: product, warehouse, type, qty_base (+/-), unit_cost/unit_price, ref_type/ref_id, `void` |
| `doc_counters` | penomoran per prefix/tahun/bulan |
| `staff` | (tidak dipakai lagi sejak tanpa login) |

**View:** `v_stock` (stok per produk per gudang, non-void), `v_products` (produk + `stock_total`).
Tipe mutasi: `opening, purchase, sale, sale_return, purchase_return, adjust, transfer_in, transfer_out`.

### Fungsi Postgres (RPC)
| Fungsi | Guna |
|---|---|
| `save_sale(p jsonb)` | buat/ubah nota. `p.id` kosong = baru. Item: `{product_id,name,qty,unit,factor,price,warehouse_id}`. Juga `discount, shipping, tax_percent, paid_now, payment_method, due_date, notes, customer_id, customer_name, date` |
| `save_purchase(p jsonb)` | buat/koreksi barang masuk, lalu `recompute_avg_cost` |
| `resolve_new(p, kind)` | kind sale/purchase/return/delivery: cari pelanggan/supplier & barang berdasar nama (tanpa beda huruf besar/kecil), buat jika belum ada. Barang baru: satuan diketik, isi 1, harga jual = harga nota. Tiga Putra: barang baru di nota diberi mutasi `opening` sejumlah yang dijual |
| `save_sale_ex` / `save_purchase_ex` / `save_return_ex` | `resolve_new` + fungsi asli (dipakai UI; retur dari dokumen tetap `save_return`) |
| `save_delivery_note(p jsonb)` | Surat Jalan tanpa nota (buat/ubah), nomor otomatis `SJ/…` bila kosong, tidak mengurangi stok |
| `cancel_document(kind, id)` | batal nota (`sale`) / barang masuk (`purchase`) |
| `save_return(p jsonb)` / `void_return(id)` | retur / batalkan retur |
| `save_adjustment(p jsonb)` | `type`: `opening` (stok awal + harga), `adjust` (opname, qty = selisih), `transfer` (`warehouse_id` → `to_warehouse_id`) |
| `recompute_avg_cost(product)` | putar ulang mutasi untuk HPP rata-rata tertimbang |
| `report_sales(from, to, group)` | group: day, month, product, category, customer, warehouse |
| `dashboard_stats()` | angka dashboard |
| `next_doc_number(prefix, date)` | nomor dokumen |
| `default_warehouse()` | gudang kode terkecil |
| `trg_stock_guard()` | constraint trigger `stock_nonnegative` (DEFERRABLE INITIALLY DEFERRED) |
| `fmt_qty_id(numeric)` | format angka Indonesia untuk pesan error |

Ambil definisi terbaru: `select pg_get_functiondef('public.save_sale(jsonb)'::regprocedure);`

---

## 6. Cara kerja Claude di proyek ini (alur standar)

1. Baca `catatan.md` + `CLAUDE.md`. Jika permintaan ambigu → tanya dulu (pakai pilihan berganda, beri rekomendasi).
2. Cek data nyata bila soal bug: `execute_sql` (baca saja) ke project `frphemxcondxdbcbnjnh`.
3. Perubahan database: `apply_migration` **kecil-kecil** (satu atau beberapa fungsi per panggilan), lalu catat di `supabase/migrations/000N_*.sql`.
4. Uji di database tanpa menyimpan data:
   ```sql
   begin;
   set local role anon;
   set constraints all immediate;   -- agar trigger stok langsung dicek
   ... panggil save_sale / save_purchase dll ...
   select ... hasil ...;
   -- (tanpa commit; transaksi otomatis dibatalkan)
   ```
   Lalu pastikan data uji tidak tersimpan.
5. Frontend: `npx tsc --noEmit && npm run build` harus lulus.
6. Commit → push ke branch kerja → buat PR ke `main` → merge (pemilik sudah mengizinkan deploy langsung) → cek status deploy Vercel sampai `READY` dan alias `notatigaputra.vercel.app` terpasang.
7. Laporkan ke pemilik dalam Bahasa Indonesia: apa yang berubah, cara mencoba, dan apa yang belum bisa diverifikasi.
8. Perbarui `catatan.md` (bagian 9 & 11) dan `CLAUDE.md` bila ada keputusan baru.

---

## 7. Hal teknis yang perlu diingat (gotcha)

- **Supabase MCP menahan SQL berisi `delete`** (menunggu konfirmasi lalu timeout 60 detik). Karena itu desainnya memakai flag `void`/`active`, bukan delete. Hapus baris lewat REST dari aplikasi (mis. pembayaran, satuan) tetap berjalan.
- **Migrasi besar timeout** → pecah menjadi beberapa `apply_migration`.
- **Sandbox Claude tidak bisa membuka** `*.vercel.app` dan `*.supabase.co` (proxy 403), kecuali network environment diatur (bagian 4). Verifikasi lewat MCP Supabase & status deploy Vercel; tampilan dicek oleh pemilik.
- **`web_fetch_vercel_url` Vercel** mengembalikan 403 untuk akun ini; jangan diandalkan.
- **Vercel API** untuk project ini dipanggil **tanpa** `teamId` (dengan teamId → 403).
- Next.js 16: halaman yang memakai `useSearchParams` dibungkus `<Suspense>`; file `page.tsx` hanya boleh export default (komponen bersama taruh di `components/`).
- Batas 1000 baris PostgREST → gunakan `fetchAll`.
- Pemilik bisa sedang memakai website saat Claude bekerja → **cek ulang data terbaru sebelum memperbaiki data**.
- Perbaikan data dilakukan lewat fungsi resmi (`save_purchase`, `save_sale`, `save_adjustment`) agar HPP & stok konsisten — bukan UPDATE langsung ke mutasi.

- Cetak: `@page { margin: 0 }` + padding 12mm di `.print-area` agar browser tidak mencetak header/footer (URL, tanggal, nomor halaman). Jangan kembalikan margin @page. PDF memotong halaman di `tbody tr`, `.pdf-keep`, `.sj-sign`; tabel barang wajib class `items-table`.

---

## 8. Riwayat perubahan (PR)

| PR | Isi |
|---|---|
| [#1](https://github.com/Atharffndd/Wibowowebsite/pull/1) | Aplikasi awal: nota, stok 2 gudang, barang masuk, piutang/hutang, retur, laporan, login staff |
| [#2](https://github.com/Atharffndd/Wibowowebsite/pull/2) | Tanpa login; data tidak dihapus (void/active); A.N. rekening Muhammad Rizqy |
| [#3](https://github.com/Atharffndd/Wibowowebsite/pull/3) | `CLAUDE.md` konteks proyek |
| [#4](https://github.com/Atharffndd/Wibowowebsite/pull/4) | Stok gudang tidak boleh minus; "Koreksi data" vs "+ Barang masuk baru"; perbaikan data Susu Ultra |
| [#5](https://github.com/Atharffndd/Wibowowebsite/pull/5) | Gudang per barang di nota, barang masuk, retur; nota cetak menggabungkan baris |
| [#6](https://github.com/Atharffndd/Wibowowebsite/pull/6) | catatan.md |
| (PR berikutnya) | Fitur Surat Jalan |

- (PR berikutnya) Tampilan ramah iPad: menu ☰ di bawah 1024px, isian barang berbentuk kartu, bar Simpan bawah, kolom isian 16px/44px untuk layar sentuh.
- (PR #9) WhatsApp Nota & Surat Jalan kirim file PDF (menu Bagikan), Unduh PDF langsung, hapus header/footer cetak & baris "Nota: …" di Surat Jalan.
- (PR #11) Cap & paraf digambar langsung ke kanvas PDF (hilang di Safari iPad).
- (Okt 2026) Layout Nota & Surat Jalan khas Tiga Putra: versi pertama (banyak kotak/warna) dinilai terlalu ramai → pemilik memilih **Opsi B** dari 4 pratinjau (judul tabel & TOTAL biru muda, kata NOTA biru kanan atas, putih bersih). Kelas CSS `tp-*`.
- (Okt 2026) Opsi grosir/eceran dihapus (1 harga jual); pelanggan/supplier/barang baru bisa diketik langsung (`NameCombo`, `ItemsEditor allowNew`); setelah pilih barang kursor ke Jumlah → Enter Harga → Enter kembali ke cari barang; Surat Jalan tanpa nota (menu Surat Jalan → "+ Surat Jalan tanpa nota").

Migrasi database: `0001_init` (skema awal) · `0002_open_access_ledger` (tanpa login + void) · `0003_stock_guard` (stok tidak minus) · `0004_item_warehouse` (gudang per item) · `0005_delivery_notes` (Surat Jalan) · `0006_ketik_baru_sj_mandiri` (harga jual tunggal, ketik baru, Surat Jalan tanpa nota).

---

## 9. Masalah terbuka / menunggu jawaban pemilik

- **Susu Ultra 125 ML Fullcream — stok per gudang:** total benar (400 dus), tetapi Gudang 1-P = −600 dan Gudang 2-R = 1000, karena nota `INV/2026/10/0006` (500 dus) dan `INV/2026/10/0007` (100 dus) diambil dari 1-P sementara stok ada di 2-R (`BM/2026/10/0005`). Pilihan yang ditawarkan:
  1. Ubah gudang item di kedua nota menjadi 2-R (jika barang memang keluar dari 2-R), atau
  2. Catat transfer 600 dus dari 2-R ke 1-P (`save_adjustment` type `transfer`).
  Hasil keduanya: 1-P = 0, 2-R = 400. **Belum dijawab pemilik.**
- Riwayat: `BM/2026/10/0001` pernah diubah 150→1000 setelah 150 dus terjual; sudah dipulihkan ke 150 dus @120.000 (1-P), dan 1000 dus @117.000 menjadi `BM/2026/10/0005` (2-R, tanggal 2026-10-04).

---

## 10. Membuat versi untuk perusahaan lain (langkah lengkap)

1. **Data dari pemilik** (lihat bagian 4).
2. **Supabase:** buat project baru (org "Atharffndd", region `ap-southeast-1`; paket free punya batas jumlah project aktif).
3. **Skema:** terapkan `supabase/migrations/0001_init.sql`, `0002…`, `0003…`, `0004…` secara bertahap (pecah agar tidak timeout). Lalu salin definisi **terbaru** semua fungsi dari project Tiga Putra dengan `pg_get_functiondef` dan terapkan di project baru (file migrasi hanya ringkasan untuk beberapa fungsi).
4. **Isi data:** `settings` (nama, alamat, HP, banks, account_name, prefix), `warehouses`, pelanggan, supplier, barang + `product_units` (atau pakai fitur Import Excel di menu Barang).
5. **Kode:** repo/branch baru dari repo ini. Ganti:
   - default URL & key di `lib/supabase.ts` dan `.env.example`
   - `public/ttd.webp`
   - judul di `app/layout.tsx`, teks "TIGA PUTRA / SUPPLIER" di `components/Shell.tsx`, footer sidebar
   - kop nota memakai `settings.company_name + " Supplier"` di `components/Invoice.tsx` (sesuaikan bila nama usaha bukan "Supplier")
6. **Vercel:** project baru dari repo tersebut, framework Next.js, env `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`, tambah domain `nota<nama>.vercel.app`, matikan SSO protection jika tanpa login.
7. **Uji** alur: barang masuk → nota → stok → laporan (simulasi transaksi tanpa commit), lalu serahkan ke pemilik.
8. Buat `catatan.md` + `CLAUDE.md` baru khusus perusahaan itu.

---

## 11. Ide pengembangan yang pernah dibahas (belum dikerjakan)

- PIN sederhana untuk membuka website (pengganti login), jika suatu saat diperlukan.
- Nomor nota bersambung tanpa reset bulanan (saat ini reset tiap bulan).
