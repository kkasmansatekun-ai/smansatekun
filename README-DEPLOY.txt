SMANSATEKUN — Paket Kode Sumber (Admin Export)
==============================================

Cara Menjalankan di Komputer Lokal:
  1. Ekstrak seluruh isi folder SMANSATEKUN ini.
  2. Salin berkas firebase-applet-config.json dari Firebase Console project Anda ke root folder.
  3. Jalankan: npm install
  4. Jalankan: npm run dev

Cara Build & Deploy ke Vercel / GitHub:
  1. Pastikan seluruh folder src/, public/, index.html, package.json, dan vercel.json berada di root repositori GitHub.
  2. Tambahkan file firebase-applet-config.json dari project Firebase Anda.
  3. Jalankan: npm run build

Catatan Keamanan:
  - Jangan pernah mengunggah berkas .env berisi secret API key ke repositori publik.
  - Tinjau file firestore.rules sebelum deploy produksi.