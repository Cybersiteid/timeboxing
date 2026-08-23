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
4. Jalankan fungsi `setupDatabase`. Versi ini menambahkan kolom `archivedAt` pada sheet `Tasks` tanpa mengganti spreadsheet atau data lama.
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

## Arsip task selesai

1. Tandai task sebagai selesai.
2. Klik tombol arsip pada task tersebut.
3. Buka menu `Arsip` untuk melihat, memulihkan, atau menghapus task secara permanen.
4. Status arsip ikut tersimpan pada kolom `archivedAt` di Google Sheets.

## Instal sebagai PWA

Setelah deployment Netlify selesai, buka aplikasi melalui Chrome atau Edge. Tombol instal akan muncul di kanan atas ketika browser menyatakan aplikasi siap dipasang. Klik tombol tersebut untuk memasang Task Time Boxing sebagai aplikasi desktop atau HP.

Halaman utama, ikon, dan data lokal dapat dibuka saat offline. Perubahan lokal akan dikirim ke Google Sheets setelah koneksi kembali dan kunci akses masih tersimpan pada perangkat.

## Mode gelap

Klik tombol bulan atau matahari di kanan atas aplikasi untuk mengganti tema. Pilihan disimpan pada perangkat dan digunakan kembali saat aplikasi dibuka. Jika belum pernah memilih tema, aplikasi mengikuti pengaturan terang atau gelap dari sistem.

## Task berulang

Pilih `Setiap hari`, `Setiap minggu`, atau `Setiap bulan` pada kolom **Ulangi**. Task berulang yang belum memiliki deadline akan dimulai dari hari ini. Saat task ditandai selesai, aplikasi otomatis membuat satu task berikutnya dengan subtask yang kembali belum tercentang.

Metadata pengulangan, waktu selesai, dan catatan fokus ikut disimpan melalui JSON subtask yang sudah didukung backend GAS. Tidak diperlukan environment variable atau perubahan `Code.gs` tambahan untuk versi ini.

## Kalender

Buka menu **Kalender** untuk melihat task berdasarkan deadline. Pada komputer, seret task ke tanggal tujuan untuk mengubah deadline. Klik nama task untuk membuka editor. Klik angka tanggal untuk kembali ke form task dengan deadline yang sudah terisi; cara ini juga nyaman digunakan di HP.

## Pengingat

Klik tombol lonceng di kanan atas lalu izinkan notifikasi browser. Aplikasi memberi pengingat 15 menit sebelum waktu mulai, pada hari deadline untuk task tanpa jam mulai, dan ketika task terlambat. Klik lonceng lagi untuk menonaktifkannya.

Pengingat berjalan saat aplikasi atau PWA sedang terbuka. Fitur ini tidak memakai layanan push eksternal, sehingga browser yang benar-benar ditutup tidak dapat menjalankan pengingat terjadwal.

## Dashboard produktivitas

Menu **Dashboard** menampilkan task selesai minggu berjalan, waktu fokus yang dicatat timer, task terlambat, persentase pencapaian, grafik harian, rutinitas aktif, dan total fokus. Data task lama tetap dapat dibuka; statistik waktu fokus mulai bertambah setelah timer versi ini digunakan.

Jika status `Offline - tersimpan lokal`, periksa log fungsi `data`. Penyebab umum: URL bukan `/exec`, environment variable belum diisi, deployment GAS belum diperbarui, atau akses Web App bukan `Anyone`.

## Memindahkan data lama

Klik `⇩` pada aplikasi lama untuk membuat backup JSON. Di aplikasi Netlify klik `⇧`, pilih file tersebut, lalu tunggu sinkronisasi selesai.

## Keamanan

- Jangan memasukkan `GAS_API_TOKEN` ke `index.html` atau Git.
- Jangan memasukkan `APP_ACCESS_TOKEN` ke `index.html`, GAS, atau Git.
- Tombol `#` di bagian kanan atas aplikasi digunakan untuk mengganti kunci yang tersimpan pada browser.
- Jika token bocor, hapus property `TASK_TIMEBOXING_API_TOKEN` pada Script Properties lalu jalankan `setupApi` lagi.
