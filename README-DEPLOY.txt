SMANSATEKUN — Paket Kode Sumber (Admin Export)
==============================================

Sudah termasuk: seluruh src/, aset gambar, firebase-applet-config.json, vercel.json, dan firestore.rules.

Cara Menjalankan di Komputer Lokal:
  1. Ekstrak seluruh isi folder SMANSATEKUN ini.
  2. Jalankan: npm install
  3. Jalankan: npm run dev

Cara Deploy ke GitHub -> Vercel:
  1. Unggah SELURUH isi di dalam folder SMANSATEKUN (termasuk firebase-applet-config.json) langsung ke root repositori GitHub Anda.
  2. Vercel akan otomatis menjalankan `npm run build` dan menayangkan aplikasi.
  3. Tambahkan domain Vercel Anda (contoh: nama-app.vercel.app) ke Firebase Console -> Authentication -> Settings -> Authorized Domains agar Login Google berfungsi di domain Vercel.

Catatan Keamanan:
  - Jangan pernah mengunggah berkas .env berisi secret API key ke repositori publik.
  - Tinjau file firestore.rules secara berkala di Firebase Console.