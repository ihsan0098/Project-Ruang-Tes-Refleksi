# Project Ruang — Tes Refleksi

Website kampanye digital LIDM 2026 Universitas Negeri Padang: film pendek, tes refleksi (Orang Tua / Anak / Masyarakat), galeri foto, pohon dialog, forum, dan dashboard admin.

## Galeri foto dan video
Pengunjung dapat mengirim foto JPG/PNG/GIF/WebP dan video MP4/WebM/OGG (maksimal 3 MB per video). Kiriman baru berstatus menunggu persetujuan; admin dapat menyetujui atau menghapusnya dari bagian **Moderasi Galeri Foto & Video** di dashboard. Hanya media yang disetujui yang tampil di galeri publik.

Tanpa konfigurasi Firebase, data tersimpan di browser yang digunakan dan tidak dibagikan ke perangkat lain. Firebase opsional di `db.js` menyinkronkan data, tetapi penyimpanan file tetap memakai Realtime Database. Login dashboard dan persetujuan di aplikasi statis ini bukan kontrol akses yang aman untuk produksi; izin admin yang benar-benar terjamin memerlukan autentikasi dan validasi status di server serta aturan database yang membatasi perubahan status hanya untuk admin.

Kiriman Pohon Dialog dan Forum langsung tampil di halaman setelah dikirim. Pembaruan langsung antarperangkat membutuhkan konfigurasi Firebase di `db.js`; tanpa konfigurasi, data hanya tersimpan pada browser/perangkat tersebut (tab lain pada browser yang sama akan menerima pembaruan).

## Struktur
- `index.html` — halaman utama
- `admin.html` — dashboard admin (ID: admin)
- `db.js` — sinkronisasi realtime (Firebase, opsional)

## Publikasi website
Workflow GitHub Pages tersedia di `.github/workflows/deploy-pages.yml`.

1. Push perubahan ke branch `main`.
2. Di GitHub, buka **Settings → Pages**, lalu pilih **GitHub Actions** sebagai *Build and deployment source*.
3. Setelah workflow **Publish website to GitHub Pages** selesai, website tersedia di `https://ihsan0098.github.io/Project-Ruang-Tes-Refleksi/`.

GitHub Pages hanya meng-host file website. Supaya Pohon Dialog dan Forum tersinkron real-time ke semua perangkat, website juga memerlukan Firebase Realtime Database yang dikonfigurasi dan aturan akses yang aman. Firebase belum diaktifkan di `db.js`.

## Menyiapkan Firebase
1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. Tambahkan aplikasi Web dan salin konfigurasi Firebase (`apiKey`, `databaseURL`, `projectId`, dan nilai lain yang ditampilkan).
3. Buat Realtime Database dalam mode terkunci dan catat URL database. Jangan aktifkan aturan `.write: true` untuk seluruh `/ruang`: semua pengunjung dapat membaca, mengubah, atau menghapus data yang tersimpan di sana.
4. Sebelum membuka akses tulis untuk kiriman publik, gunakan aturan yang hanya mengizinkan kiriman baru pada Pohon Dialog/Forum dan perubahan moderasi oleh admin yang terautentikasi. Sistem login admin statis saat ini belum cukup untuk melindungi perubahan data di Firebase.
5. Setelah project Firebase dibuat, konfigurasi web dapat digunakan untuk menghubungkan database; jangan mengirim password, service-account key, atau secret server.

Hanya kiriman Pohon Dialog, Forum, dan media galeri yang disetujui yang sebaiknya dipublikasikan. Hasil tes individual dan pesan kontak harus tetap privat. Konfigurasi sinkronisasi saat ini masih memerlukan penyesuaian aturan dan akses sebelum dipakai dengan data publik; jangan mengaktifkan aturan database terbuka untuk seluruh data.
