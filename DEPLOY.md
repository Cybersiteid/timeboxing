# Deploy Task Time Boxing Hybrid Multi-Pengguna

Arsitektur aplikasi:

```text
Browser / PWA
  -> Firebase Authentication
  -> Netlify Function (verifikasi ID token)
  -> satu backend Google Apps Script
  -> satu spreadsheet pribadi untuk setiap pengguna
```

Firebase hanya dipakai untuk login. Task, ide, kalender, dan statistik disimpan di spreadsheet pribadi milik sistem.

## Urutan deploy

1. Ikuti semua tahap pada `SETUP-HYBRID.md`.
2. Isi `firebase-config.js` dengan konfigurasi Firebase Web.
3. Siapkan Google Apps Script memakai isi folder `gas`.
4. Tambahkan empat environment variable Netlify: `GAS_API_URL`, `GAS_API_TOKEN`, `FIREBASE_PROJECT_ID`, dan `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Upload seluruh isi folder ini ke root repository GitHub, termasuk `package.json`, `.nvmrc`, folder `netlify`, dan folder `gas`.
6. Hubungkan repository ke Netlify lalu jalankan **Clear cache and deploy site**.

`GAS_API_TOKEN` dan `FIREBASE_SERVICE_ACCOUNT_JSON` adalah rahasia. Simpan hanya di environment variable Netlify, jangan di GitHub atau `firebase-config.js`.

## Cara admin menambah pengguna

1. Masuk menggunakan email admin yang ditentukan di `BOOTSTRAP_ADMIN_EMAIL`.
2. Buka menu **Admin**.
3. Isi email, nama, dan peran pengguna.
4. Aplikasi langsung membuat spreadsheet khusus untuk email tersebut.
5. Pengguna mendaftar atau masuk ke aplikasi menggunakan email yang sama.

Admin hanya memberi izin email dan membuat spreadsheet. Kata sandi dikelola Firebase dan tidak pernah disimpan di GAS maupun Google Sheets.

## Data lama

Masuk ke akun tujuan, lalu impor file backup JSON melalui tombol impor. Data akan disinkronkan ke spreadsheet akun yang sedang aktif.

## Pemeriksaan akhir

1. Uji login admin dan pastikan menu **Admin** tampil.
2. Buat satu pengguna percobaan dan buka tautan spreadsheet-nya.
3. Masuk sebagai pengguna tersebut di browser lain.
4. Buat task, muat ulang halaman, lalu periksa task pada spreadsheet pengguna.
5. Pastikan akun pengguna lain tidak dapat melihat data tersebut.

