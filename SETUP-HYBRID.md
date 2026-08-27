# Setup Firebase Auth + Satu GAS + Spreadsheet per Pengguna

Arsitektur:

```text
Browser -> Firebase Authentication -> Netlify Function -> GAS -> Spreadsheet pengguna
```

Firebase hanya menyimpan akun. Task dan ide tetap disimpan di Google Sheets.

## 1. Siapkan Firebase Authentication

1. Buka https://console.firebase.google.com/ dan buat project.
2. Daftarkan aplikasi **Web**, lalu salin objek `firebaseConfig`.
3. Isi semua nilai `GANTI_...` pada `firebase-config.js`.
4. Buka **Authentication > Sign-in method**.
5. Aktifkan **Email/Password** dan **Google**.
6. Di **Authentication > Settings > Authorized domains**, tambahkan domain Netlify tanpa `https://`.

Cloud Firestore tidak perlu dibuat untuk arsitektur ini.

## 2. Siapkan service account Firebase

1. Di Firebase buka **Project settings > Service accounts**.
2. Pilih **Generate new private key** dan simpan file JSON dengan aman.
3. Isi lengkap JSON tersebut nanti sebagai secret Netlify bernama `FIREBASE_SERVICE_ACCOUNT_JSON`.

Jangan upload file service-account JSON ke GitHub dan jangan menaruh isinya pada `firebase-config.js`. `firebase-config.js` adalah konfigurasi publik; service account adalah rahasia server.

## 3. Buat backend GAS

1. Buka https://script.google.com/ lalu buat project baru.
2. Salin isi `gas/Code.gs` ke file `Code.gs`.
3. Ganti `GANTI_EMAIL_ADMIN` pada baris pertama dengan email admin yang akan dipakai login.
4. Pada **Project Settings**, aktifkan **Show appsscript.json manifest file in editor**.
5. Ganti isi `appsscript.json` dengan isi `gas/appsscript.json`.
6. Simpan semua file.
7. Jalankan fungsi `setupSystem` dan setujui izin Drive serta Spreadsheet.
8. Buka **Execution log**. Simpan `MASTER_SPREADSHEET_URL`, `DATA_FOLDER_URL`, dan `GAS_API_TOKEN`.

`setupSystem` membuat satu Master Users spreadsheet, folder database, dan akun admin bootstrap.

## 4. Deploy GAS

1. Pilih **Deploy > New deployment > Web app**.
2. Gunakan **Execute as: Me**.
3. Gunakan akses **Anyone**.
4. Klik **Deploy**.
5. Jalankan kembali fungsi `setupApi`.
6. Salin nilai `GAS_API_URL` berakhiran `/exec` dari Execution log.

Endpoint publik tetap dilindungi `GAS_API_TOKEN`; identitas pengguna hanya diterima dari Netlify setelah Firebase ID token diverifikasi.

## 5. Environment variable Netlify

Tambahkan empat variable berikut secara terpisah:

```text
GAS_API_URL=https://script.google.com/macros/s/.../exec
GAS_API_TOKEN=token-dari-setupApi
FIREBASE_PROJECT_ID=project-id-firebase
FIREBASE_SERVICE_ACCOUNT_JSON={seluruh isi file service-account JSON}
```

Tandai `GAS_API_TOKEN` dan `FIREBASE_SERVICE_ACCOUNT_JSON` sebagai secret. `APP_ACCESS_TOKEN` tidak dipakai versi ini.

## 6. Deploy Netlify

1. Upload seluruh isi folder hasil ekstrak ke root repository GitHub.
2. Pastikan `package.json`, `.nvmrc`, dan `netlify/functions/data.js` ikut terunggah.
3. Kosongkan build command dan gunakan `.` sebagai publish directory.
4. Trigger deploy ulang setelah environment variable disimpan.

Netlify akan memasang `firebase-admin` saat build.

## 7. Login admin dan tambah pengguna

1. Masuk memakai email yang sama dengan `BOOTSTRAP_ADMIN_EMAIL`.
2. Untuk login email/password, buka tautan verifikasi yang dikirim sebelum masuk kembali. Login Google biasanya langsung terverifikasi.
3. Buka menu **Admin**.
4. Tambahkan email, nama, dan role pengguna.
5. GAS langsung membuat spreadsheet terpisah untuk pengguna tersebut.
6. Pengguna mendaftar atau masuk dengan email yang sama; UID Firebase akan ditautkan otomatis.

Dashboard tidak membuat kata sandi pengguna. Admin membuat izin dan database, sedangkan pengguna membuat kredensial melalui Firebase. Ini menghindari penyimpanan kata sandi di GAS.

## 8. Pindahkan data lama

1. Ekspor JSON dari aplikasi GAS lama.
2. Login ke akun tujuan pada aplikasi baru.
3. Impor JSON tersebut.
4. Tunggu status `Tersinkron - spreadsheet pribadi`.

Lakukan impor satu akun pada satu waktu agar data tidak masuk ke spreadsheet yang salah.

## Uji keamanan

1. Tambahkan dua email berbeda dari dashboard admin.
2. Login sebagai pengguna pertama dan buat satu task.
3. Keluar lalu login sebagai pengguna kedua; task pengguna pertama tidak boleh terlihat.
4. Nonaktifkan pengguna kedua dari dashboard admin dan pastikan aksesnya ditolak.
5. Pastikan service-account JSON tidak muncul di GitHub, source HTML, atau log browser.
