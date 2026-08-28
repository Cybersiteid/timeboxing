# Setup Firebase Authentication + Firestore

Arsitektur aplikasi:

```text
Browser / PWA -> Firebase Authentication -> Cloud Firestore
```

Tidak ada backend GAS, service-account JSON, API token, atau Netlify Function. Setiap task dan ide disimpan sebagai dokumen tersendiri di bawah UID pemilik.

## 1. Buat dan daftarkan aplikasi Firebase

1. Buka https://console.firebase.google.com/ dan buat project.
2. Google Analytics boleh dinonaktifkan.
3. Pada **Project Overview**, klik ikon Web `</>`.
4. Isi nickname, misalnya `Task Time Boxing Netlify`.
5. Jangan aktifkan Firebase Hosting karena aplikasi memakai Netlify.
6. Klik **Register app**, pilih tampilan **Config**, lalu salin objek `firebaseConfig`.
7. Isi semua nilai `GANTI_...` pada `firebase-config.js` menggunakan nilai tersebut.

Konfigurasi Firebase Web boleh berada di GitHub. Jangan pernah menaruh service-account JSON atau private key di repository.

## 2. Aktifkan Authentication

1. Buka **Build/Security > Authentication > Get started**.
2. Pada **Sign-in method**, aktifkan **Email/Password**.
3. Aktifkan **Google** dan pilih email dukungan.
4. Buka **Authentication > Settings > Authorized domains**.
5. Tambahkan domain Netlify tanpa `https://`, misalnya `timeboxi.netlify.app`.

Akun Email/Password harus membuka email verifikasi sebelum dapat memakai aplikasi. Login Google sudah terverifikasi oleh penyedia.

## 3. Buat Firestore

1. Buka **Firestore Database > Create database**.
2. Pilih **Standard edition** dan **Production mode**.
3. Pilih lokasi yang dekat dengan mayoritas pengguna. Lokasi tidak dapat dipindahkan dengan mudah setelah database dibuat.
4. Setelah database aktif, buka tab **Rules**.
5. Ganti seluruh aturan dengan isi `firestore.rules`.
6. Klik **Publish**.

Jangan menggunakan Test Mode pada aplikasi produksi. Rules paket ini mewajibkan UID jalur sama dengan UID login dan email sudah terverifikasi.

## 4. Deploy ke Netlify

1. Upload seluruh isi folder ini ke root repository GitHub.
2. Hubungkan repository tersebut ke Netlify.
3. Kosongkan build command dan gunakan `.` sebagai publish directory.
4. Jalankan **Clear cache and deploy site**.
5. Buka aplikasi lalu tekan `Ctrl + Shift + R` sekali setelah deployment pertama.

Environment variable GAS lama berikut tidak dipakai dan boleh dihapus dari Netlify:

```text
GAS_API_URL
GAS_API_TOKEN
APP_ACCESS_TOKEN
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_PROJECT_ID
```

`FIREBASE_PROJECT_ID` tidak diperlukan sebagai environment variable karena project ID sudah berada pada `firebase-config.js`.

## 5. Uji dua pengguna

1. Daftar sebagai pengguna A dan verifikasi emailnya.
2. Buat task `Data pengguna A`.
3. Keluar, lalu daftar sebagai pengguna B.
4. Pastikan task pengguna A tidak terlihat.
5. Buat task pengguna B, kemudian login kembali sebagai pengguna A.
6. Pastikan masing-masing akun hanya melihat task miliknya.

## Penyimpanan dan migrasi

Struktur data baru:

```text
users/{uid}/tasks/{taskId}
users/{uid}/ideas/{ideaId}
```

Jika akun pernah menggunakan versi Firestore satu dokumen di `users/{uid}/app/state`, aplikasi memindahkannya otomatis saat login pertama, lalu menghapus dokumen lama setelah migrasi berhasil.

Backup JSON dari versi GAS juga dapat diimpor setelah login. Pastikan akun tujuan benar sebelum memilih file.

## Sinkronisasi

- Perubahan ditahan selama 2 detik agar beberapa klik dapat digabung.
- Hanya task atau ide yang berubah yang ditulis.
- Satu proses sinkronisasi dijalankan pada satu waktu.
- Kegagalan jaringan dicoba kembali bertahap sampai maksimum sekitar 60 detik.
- Data lokal tetap tersedia ketika perangkat offline.

