# Tiga Putra Supplier — Sistem Nota, Stok & Penjualan

Aplikasi web internal untuk Tiga Putra Supplier: nota penjualan, barang masuk, stok 2 gudang, piutang/hutang, retur, biaya, dan laporan.

**Teknologi:** Next.js 16 + Tailwind 4 (hosting Vercel), Supabase (database Postgres + login).

## Fitur
- **Barang & harga**: banyak satuan per barang (dus, pcs, kg, …) dengan konversi, harga eceran & grosir, riwayat perubahan harga, import/export Excel.
- **Stok**: Gudang 1-P dan Gudang 2-R. Mutasi barang masuk/keluar lengkap dengan harga, stok awal, stok opname, transfer antar gudang, peringatan stok minimal. HPP dihitung dengan **rata-rata tertimbang**.
- **Nota penjualan**: nomor otomatis `INV/2026/10/0001` (urut per bulan), harga otomatis (harga khusus pelanggan → harga grosir/eceran, dengan petunjuk harga terakhir), diskon, ongkir, PPN opsional, cetak/PDF dengan TTD & paraf, kirim ke WhatsApp, ubah/batalkan.
- **Barang masuk**: pembelian dari supplier beserta harga beli, ongkir, diskon, hutang.
- **Pelanggan & supplier**: kontak, tipe harga, tempo, harga khusus, riwayat transaksi.
- **Piutang & hutang**: cicilan/pelunasan, jatuh tempo, daftar lewat tempo.
- **Retur** penjualan & pembelian (stok dan saldo otomatis menyesuaikan).
- **Biaya operasional** untuk menghitung laba bersih.
- **Laporan**: penjualan, HPP, laba kotor/bersih per hari, bulan, barang, kategori, pelanggan, gudang, plus export Excel.

## Setup

### 1. Supabase (project `tiga-putra`)
Tabel, data awal, dan sebagian besar fungsi sudah terpasang. Sisanya:
1. **Authentication → Users → Add user**: buat akun login (email + password).
2. **Authentication → Sign In / Providers**: matikan *Allow new users to sign up* (aplikasi internal).
3. **SQL Editor → New query**: tempel isi `supabase/JALANKAN_DI_SQL_EDITOR.sql`, lalu klik **Run**. File ini memasang fungsi simpan nota/barang masuk dan menjadikan akun di langkah 1 sebagai staff.

Pengguna berikutnya: buat akunnya di Authentication, lalu tambahkan emailnya di menu **Pengaturan → Pengguna**.

### 2. Vercel
Environment variables (sudah ada nilai default di kode, jadi opsional):
```
NEXT_PUBLIC_SUPABASE_URL=https://frphemxcondxdbcbnjnh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_KjYFYKNtMJ9N3JdjmkASMg_Y1udWy51
```

### 3. Lokal (opsional)
```bash
npm install
npm run dev   # http://localhost:3000
```

## Struktur
- `app/(app)/*`: halaman aplikasi (dashboard, nota, barang-masuk, stok, …)
- `components/`: UI, nota (`Invoice.tsx`), editor barang, pembayaran
- `supabase/migrations/0001_init.sql`: skema lengkap (referensi / instalasi baru)
- `public/ttd.webp`: TTD & paraf bawaan di nota (bisa diganti di Pengaturan)
