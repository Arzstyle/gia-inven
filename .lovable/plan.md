

# 🏗️ Sistem Manajemen Inventory - GIA Toko Bangunan

## Backend (Supabase Cloud - Gratis)

### Database Tables
- **kategori** — id, nama, deskripsi, created_at
- **subkategori** — id, kategori_id (FK), nama, created_at
- **barang** — id, kode, nama, kategori_id (FK), subkategori_id (FK), satuan, stok, stok_minimum, created_at
- **supplier** — id, nama, kontak, alamat, created_at
- **stok_masuk** — id, barang_id (FK), supplier_id (FK), jumlah, tanggal, keterangan, user_id (FK), created_at
- **stok_keluar** — id, barang_id (FK), jumlah, tanggal, keterangan, user_id (FK), created_at
- **log_aktivitas** — id, user_id (FK), aksi, detail, created_at
- **user_roles** — id, user_id (FK), role (admin/kasir)

### Autentikasi
- Login dengan email/password via Supabase Auth
- Akun default admin: giamulya123@gia.com / giamulya123
- Role disimpan di tabel `user_roles` (admin & kasir)
- RLS policies untuk keamanan data

---

## Frontend

### 1. Halaman Login
- Form login dengan email & password
- Notifikasi error jika gagal
- Redirect ke Dashboard setelah berhasil

### 2. Layout Utama
- **Sidebar compact** dengan ikon: Dashboard, Kategori, Subkategori, Barang, Supplier, Stok Masuk, Stok Keluar, Laporan, Log Aktivitas
- **Tema**: Biru tua, abu-abu, putih — compact & data-dense
- Responsif desktop & mobile

### 3. Dashboard
- Kartu ringkasan: Total Kategori, Total Barang, Total Stok, Barang Stok Menipis
- Tabel peringatan stok minimum
- Aktivitas terbaru

### 4. Master Data (Full CRUD)
Setiap halaman memiliki: tabel data, tombol tambah, edit, hapus, dan pencarian.

- **Kategori** — CRUD nama & deskripsi kategori
- **Subkategori** — CRUD subkategori terhubung ke kategori
- **Barang** — CRUD barang dengan kode, nama, kategori, subkategori, satuan, stok minimum
- **Supplier** — CRUD nama, kontak, alamat supplier

### 5. Manajemen Stok
- **Stok Masuk** — Form input: pilih barang, supplier, jumlah, tanggal, keterangan → stok otomatis bertambah
- **Stok Keluar** — Form input: pilih barang, jumlah, tanggal, keterangan → stok otomatis berkurang
- Tabel riwayat transaksi dengan filter
- Notifikasi otomatis saat stok di bawah minimum

### 6. Laporan (2 Jenis)

#### 📋 Laporan Stok Masuk
- **Harian** — rekap barang masuk hari ini
- **Mingguan** — rekap barang masuk 7 hari terakhir
- **Bulanan** — rekap barang masuk per bulan
- Filter berdasarkan periode tanggal, kategori, supplier
- Tabel detail dengan total jumlah masuk

#### 📋 Laporan Stok Keluar
- **Harian** — rekap barang keluar hari ini
- **Mingguan** — rekap barang keluar 7 hari terakhir
- **Bulanan** — rekap barang keluar per bulan
- Filter berdasarkan periode tanggal, kategori
- Tabel detail dengan total jumlah keluar

Kedua laporan menampilkan ringkasan angka di atas dan tabel detail di bawah, dengan opsi cetak/print.

### 7. Log Aktivitas
- Pencatatan otomatis setiap aksi (login, CRUD, stok masuk/keluar)
- Tabel log dengan filter tanggal dan jenis aksi

