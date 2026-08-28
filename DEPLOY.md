# Deploy Task Time Boxing Firebase

Gunakan `FIREBASE-SETUP.md` sebagai panduan utama.

## Arsitektur

```text
Netlify / PWA -> Firebase Authentication -> Cloud Firestore
```

Setiap pengguna mempunyai koleksi task dan ide berdasarkan UID. Firestore Security Rules mencegah akun membaca jalur UID pengguna lain.

## Isi yang harus diunggah

- `index.html`
- `firebase-config.js`
- `firestore.rules`
- `firebase.json`
- `netlify.toml`
- `_headers`
- `service-worker.js`
- `manifest.webmanifest`
- folder `icons`

File `firestore.rules` tidak otomatis dipublikasikan oleh Netlify. Aturan harus dipublikasikan melalui Firebase Console atau Firebase CLI.

## Pemeriksaan setelah deploy

1. Pastikan tidak ada nilai `GANTI_...` pada `firebase-config.js`.
2. Pastikan domain Netlify terdaftar di Firebase Authorized domains.
3. Pastikan Rules sudah dipublikasikan.
4. Uji pendaftaran, verifikasi email, login Google, dan pemulihan kata sandi.
5. Uji isolasi menggunakan dua akun berbeda.
6. Pantau pemakaian melalui **Firestore Database > Usage**.

## Instal sebagai aplikasi

- Chrome atau Edge desktop: klik tombol **Instal aplikasi** di kanan atas aplikasi.
- Android: klik tombol instal di aplikasi atau pilih **Instal aplikasi** dari menu Chrome.
- iPhone/iPad: buka dengan Safari, pilih **Bagikan**, lalu **Tambahkan ke Layar Utama**.

Saat dibuka melalui browser dan belum terpasang, aplikasi menampilkan banner instal otomatis setelah pengguna masuk. Browser tetap memerlukan satu klik pada tombol **Instal** sebelum menampilkan konfirmasi sistem.

Setelah mengganti ikon atau service worker, gunakan **Clear cache and deploy site** di Netlify lalu muat ulang aplikasi satu kali.

Versi ini tidak memakai GAS maupun Netlify Functions. Pengguna dapat dikelola melalui **Firebase Console > Authentication > Users**.
