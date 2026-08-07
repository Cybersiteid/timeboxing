# Deploy Netlify dengan Database GAS

Arsitektur paket ini:

```text
Browser -> Netlify Function -> GAS Web App -> Google Sheets
```

Token GAS hanya disimpan sebagai environment variable Netlify dan tidak dikirim ke browser.

## 1. Perbarui backend GAS

1. Buka project Apps Script Task Time Boxing.
2. Ganti isi `Code.gs` dengan versi terbaru dari folder `task-timeboxing-gas`.
3. Simpan project.
4. Jalankan fungsi `setupDatabase` jika database belum pernah dibuat.
5. Jalankan fungsi `setupApi`.
6. Buka **Execution log**, lalu simpan dua nilai berikut secara rahasia:

```text
GAS_API_URL=https://script.google.com/macros/s/.../exec
GAS_API_TOKEN=...
```

## 2. Deploy ulang GAS

1. Buka **Deploy > Manage deployments**.
2. Edit deployment Web App dan pilih **New version**.
3. Gunakan **Execute as: Me**.
4. Agar dapat dipanggil server Netlify, pilih akses **Anyone**.
5. Klik **Deploy**.

Endpoint tetap dilindungi oleh `GAS_API_TOKEN`. Jangan menyimpan token di HTML atau repository.

## 3. Deploy Netlify melalui Git

Netlify Functions harus dibangun oleh Netlify. Jangan memakai Netlify Drop anonim untuk paket ini.

1. Buat repository GitHub atau GitLab baru.
2. Masukkan seluruh isi folder `task-timeboxing-netlify`, termasuk `netlify/functions`.
3. Di Netlify pilih **Add new project > Import an existing project**.
4. Hubungkan repository tersebut.
5. Kosongkan build command dan gunakan `.` sebagai publish directory.
6. Deploy project.

## 4. Tambahkan environment variables

Di **Project configuration > Environment variables**, tambahkan:

```text
GAS_API_URL     = URL /exec dari setupApi
GAS_API_TOKEN   = token dari setupApi
APP_ACCESS_TOKEN = kunci akses rahasia buatan Anda
```

Gunakan kunci akses yang panjang dan sulit ditebak, minimal 20 karakter. Jangan menuliskan `APP_ACCESS_TOKEN` di repository. Setelah menyimpan ketiga environment variable secara terpisah, jalankan **Trigger deploy > Deploy site**.

## 5. Verifikasi

1. Buka URL Netlify dan masukkan nilai `APP_ACCESS_TOKEN` pada layar kunci.
2. Tunggu status `Tersinkron ke Google Sheets`.
3. Tambahkan satu task percobaan.
4. Muat ulang halaman dan pastikan task tetap ada.
5. Periksa spreadsheet `Task Time Boxing Data`.
6. Buka `/api/data` secara langsung; respons `Kunci akses tidak valid` menandakan endpoint sudah terlindungi.

Jika status `Offline - tersimpan lokal`, periksa log fungsi `data`. Penyebab umum: URL bukan `/exec`, environment variable belum diisi, deployment GAS belum diperbarui, atau akses Web App bukan `Anyone`.

## Memindahkan data lama

Klik `⇩` pada aplikasi lama untuk membuat backup JSON. Di aplikasi Netlify klik `⇧`, pilih file tersebut, lalu tunggu sinkronisasi selesai.

## Keamanan

- Jangan memasukkan `GAS_API_TOKEN` ke `index.html` atau Git.
- Jangan memasukkan `APP_ACCESS_TOKEN` ke `index.html`, GAS, atau Git.
- Tombol `#` di bagian kanan atas aplikasi digunakan untuk mengganti kunci yang tersimpan pada browser.
- Jika token bocor, hapus property `TASK_TIMEBOXING_API_TOKEN` pada Script Properties lalu jalankan `setupApi` lagi.
