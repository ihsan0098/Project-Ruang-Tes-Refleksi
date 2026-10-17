# Project Ruang — Tes Refleksi

Website kampanye digital LIDM 2026 Universitas Negeri Padang: tes refleksi, galeri foto/video, Pohon Dialog, forum, dan dashboard admin.

## Sinkronisasi dan privasi

- Pohon Dialog dan Forum tersinkron realtime ke Firebase dan dapat dibaca semua pengunjung. Nama/inisial serta pesan yang dikirim bersifat publik.
- Skor tes hanya dikirim jika pengunjung mencentang persetujuan eksplisit. Hanya kategori dan skor akhir anonim yang disimpan; hasil hanya dapat dibaca admin yang telah diizinkan di Firebase.
- Pesan kontak disimpan di koleksi privat dan hanya dapat dibaca admin yang telah diizinkan.
- Dashboard menerima pembaruan tes, pesan kontak, Pohon Dialog, Forum, galeri, dan penghitung kunjungan secara realtime. Data privat/moderasi hanya dibaca admin yang diizinkan melalui Firebase Authentication.
- Foto/video disimpan sebagai Data URL di Realtime Database dan dibaca publik setelah admin menyetujui kiriman. Batas unggah adalah 1 MB per file; hapus media yang tidak lagi dibutuhkan karena media ikut memakai kuota penyimpanan dan unduhan database.
- Penghitung mencatat satu kunjungan per tab per sesi browser; ini bukan hitungan pengguna unik dan tidak memakai proteksi bot/rate-limit.
- Data lama yang tersimpan di browser tidak otomatis dimigrasikan ke Firebase.
- Kiriman Pohon Dialog/Forum dan unggahan media dapat masuk tanpa moderasi awal. Aturan validasi panjang, ukuran, dan bentuk data tidak mencegah spam sepenuhnya. Untuk rate limiting dan anti-spam yang kuat perlu backend tepercaya.
- Bagian Edukasi dan FAQ tersedia dari navigasi desktop maupun mobile. Panduan percakapan dapat dibaca langsung dan dicetak/disimpan sebagai PDF melalui browser.
- Pesan narahubung dikirim melalui formulir realtime di situs. Tombol kontak langsung tidak ditampilkan sampai alamat email dan nomor WhatsApp resmi tersedia.

## Menyiapkan akses admin dengan aman

1. Di Firebase Console, buka **Authentication → Sign-in method** dan aktifkan **Email/Password**.
2. Di **Authentication → Users**, tambahkan akun admin dengan kata sandi kuat. Salin UID akun yang ditampilkan Firebase; jangan masukkan kata sandi ke kode sumber.
3. UID admin yang sudah didaftarkan adalah `SBtTiBYjL4dBMD2HIYJpFKaGmVB2`; berkas [`database.rules.json`](./database.rules.json) sudah memakai UID ini pada aturan data privat. Pastikan hanya akun admin tepercaya yang memakai UID tersebut.
4. Buka **Realtime Database → Rules**, terbitkan aturan terbaru dari [`database.rules.json`](./database.rules.json). Aturan menolak akses root, memberi baca publik hanya pada Pohon Dialog/Forum, penghitung, dan media yang disetujui; data tes, kontak, serta antrian moderasi hanya dapat dibaca admin.
5. Tambahkan domain Vercel/custom domain ke **Authentication → Settings → Authorized domains** bila belum ada.
6. Deploy file website yang sudah diperbarui ke Vercel. Login di `/admin.html` dengan akun Firebase tersebut; UID yang tampil harus sama dengan UID yang dimasukkan ke aturan.
7. Uji dari browser lain: Pohon Dialog/Forum dan media yang disetujui harus muncul bagi semua pengunjung; unggahan baru hanya terlihat di dashboard sebelum disetujui; skor tes (setelah persetujuan) dan pesan kontak hanya terlihat di dashboard admin.

Galeri memakai Realtime Database agar tidak memerlukan layanan Storage tambahan. Karena file media menjadi bagian dari data database yang diunduh pengunjung, pendekatan ini cocok hanya untuk galeri kecil dengan unggahan terbatas; jangan menganggap layanan gratis tanpa batas.

Jangan membuka `.read` atau `.write` untuk seluruh database. Konfigurasi Web Firebase di [`db.js`](./db.js) memang digunakan pada browser dan bukan secret; service-account key atau kredensial admin tidak boleh dimasukkan ke file frontend.

## Struktur

- `index.html` — halaman utama dan formulir publik
- `admin.html` — dashboard realtime dengan Firebase Authentication
- `db.js` — koneksi Firebase, kiriman publik, dan data privat
- `database.rules.json` — aturan akses Realtime Database; isi UID admin sebelum diterbitkan
