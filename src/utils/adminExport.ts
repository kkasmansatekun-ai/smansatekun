import JSZip from 'jszip';
import {
  BeritaItem,
  DokumentasiItem,
  InstagramPost,
  InventoryItem,
  JabatanItem,
  LmsCourse,
  ProcurementRequest,
  StudentPoint,
} from '../types/smansatekun';
import { buildCsvString, triggerBlobDownload } from './exportData';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase';
import { sourceFileLoaders, SOURCE_MANIFEST_TEMPLATE } from './sourceFilesManifest';

export interface DatabaseBackupPayload {
  app: string;
  exportedAt: string;
  exportedBy: string;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  counts: {
    dokumentasi: number;
    berita: number;
    instagramPosts: number;
    jabatan: number;
    lmsCourses: number;
    poinMurid: number;
    inventaris: number;
    permintaan: number;
  };
  collections: {
    dokumentasi: DokumentasiItem[];
    berita: BeritaItem[];
    instagramPosts: InstagramPost[];
    jabatan: JabatanItem[];
    lmsCourses: LmsCourse[];
    poinMurid: StudentPoint[];
    inventaris: InventoryItem[];
    permintaan: ProcurementRequest[];
  };
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function downloadDatabaseBackupJson(backup: DatabaseBackupPayload): void {
  const jsonText = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  triggerBlobDownload(blob, `Backup_Database_SMANSATEKUN_${getDateStamp()}.json`);
}

export async function downloadDatabaseBackupZip(backup: DatabaseBackupPayload): Promise<void> {
  const zip = new JSZip();
  const stamp = getDateStamp();

  zip.file('database-backup.json', JSON.stringify(backup, null, 2));

  const csvFolder = zip.folder('csv');
  if (csvFolder) {
    csvFolder.file(
      'inventaris.csv',
      buildCsvString(
        ['Kode Barang', 'Kategori', 'Nama Perangkat', 'Spesifikasi', 'Lokasi', 'Kondisi', 'Keterangan', 'Terakhir Diperiksa'],
        backup.collections.inventaris.map((i) => [
          i.kodeBarang,
          i.kategori,
          i.namaPerangkat,
          i.spesifikasi,
          i.lokasi,
          i.kondisi,
          i.keterangan,
          i.terakhirDiperiksa,
        ])
      )
    );

    csvFolder.file(
      'permintaan.csv',
      buildCsvString(
        ['Tahun', 'Nama Perangkat', 'Spesifikasi', 'Jumlah', 'Estimasi Harga', 'Urgensi', 'Status', 'Pengusul'],
        backup.collections.permintaan.map((r) => [
          r.tahunAnggaran,
          r.namaPerangkat,
          r.spesifikasiSingkat,
          r.jumlah,
          r.estimasiHarga,
          r.urgensi,
          r.status,
          r.pengusul,
        ])
      )
    );

    csvFolder.file(
      'poin-murid.csv',
      buildCsvString(
        ['NIS', 'Nama Murid', 'Kelas', 'Poin Prestasi', 'Poin Pelanggaran', 'Total Poin'],
        backup.collections.poinMurid.map((s) => [
          s.nis,
          s.nama,
          s.kelas,
          s.poinPrestasi,
          s.poinPelanggaran,
          s.poinPrestasi - s.poinPelanggaran,
        ])
      )
    );

    csvFolder.file(
      'dokumentasi.csv',
      buildCsvString(
        ['Tanggal', 'Bulan', 'Kategori', 'Judul', 'Pengunggah', 'Peran'],
        backup.collections.dokumentasi.map((d) => [
          d.tanggal,
          d.bulan,
          d.kategori,
          d.judul,
          d.uploaderName,
          d.uploaderRole,
        ])
      )
    );

    csvFolder.file(
      'instagram.csv',
      buildCsvString(
        ['Tanggal', 'Akun Instagram', 'Judul / Caption', 'Link Postingan'],
        backup.collections.instagramPosts.map((p) => [
          p.tanggal,
          p.akunInstagram,
          p.judul,
          p.postUrl,
        ])
      )
    );

    csvFolder.file(
      'struktur-jabatan.csv',
      buildCsvString(
        ['NIP', 'Nama', 'Jabatan', 'Tingkat', 'Tugas Pokok'],
        backup.collections.jabatan.map((j) => [
          j.nip,
          j.nama,
          j.jabatan,
          j.tingkat,
          j.tugasPokok,
        ])
      )
    );
  }

  zip.file(
    'PANDUAN-RESTORE.txt',
    [
      'BACKUP DATABASE SMANSATEKUN',
      '===========================',
      `Tanggal Export  : ${backup.exportedAt}`,
      `Diekspor oleh   : ${backup.exportedBy}`,
      `Firebase Project: ${FIREBASE_PROJECT_ID}`,
      `Database ID     : ${FIRESTORE_DATABASE_ID}`,
      '',
      'Isi Paket Backup:',
      '1. database-backup.json : Salinan lengkap seluruh koleksi Firestore dalam format JSON.',
      '2. csv/*.csv            : Ringkasan tabel siap buka di Microsoft Excel / Google Sheets.',
      '',
      'Simpan file backup ini di penyimpanan aman milik Admin Laboratorium.',
    ].join('\n')
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerBlobDownload(blob, `Backup_Database_SMANSATEKUN_${stamp}.zip`);
}

export async function downloadProjectSourceZip(): Promise<number> {
  const zip = new JSZip();
  const rootFolder = zip.folder('SMANSATEKUN');
  if (!rootFolder) {
    throw new Error('Gagal membuat arsip ZIP.');
  }

  const entries = Object.entries(sourceFileLoaders);
  let addedCount = 0;

  await Promise.all(
    entries.map(async ([filePath, loader]) => {
      const cleanPath = filePath.replace(/^\/+/, '');
      // Proteksi ekstra: pastikan tidak pernah menyertakan file .env rahasia
      if (cleanPath === '.env' || cleanPath.startsWith('.env.')) return;
      try {
        const content = await loader();
        if (typeof content === 'string') {
          rootFolder.file(cleanPath, content);
          addedCount += 1;
        }
      } catch (err) {
        console.warn(`[SMANSATEKUN ZIP] Melewati berkas ${cleanPath}:`, err);
      }
    })
  );

  // Sertakan manifest loader agar hasil ekstraksi ZIP dapat langsung di-build dengan `npm run build`
  if (SOURCE_MANIFEST_TEMPLATE) {
    rootFolder.file('src/utils/sourceFilesManifest.ts', SOURCE_MANIFEST_TEMPLATE);
    addedCount += 1;
  }

  // Sertakan templat .env.example tanpa rahasia
  rootFolder.file(
    '.env.example',
    [
      '# Konfigurasi Lingkungan SMANSATEKUN (Contoh — Tanpa Rahasia)',
      '# Jangan pernah menyimpan API key rahasia langsung di repositori publik.',
      'APP_URL=https://smansatekun.vercel.app',
    ].join('\n')
  );
  addedCount += 1;

  if (addedCount === 0) {
    throw new Error('Tidak ada berkas kode sumber yang berhasil dikemas.');
  }

  rootFolder.file(
    'README-DEPLOY.txt',
    [
      'SMANSATEKUN — Paket Kode Sumber (Admin Export)',
      '==============================================',
      '',
      'Cara Menjalankan di Komputer Lokal:',
      '  1. Ekstrak seluruh isi folder SMANSATEKUN ini.',
      '  2. Salin berkas firebase-applet-config.json dari Firebase Console project Anda ke root folder.',
      '  3. Jalankan: npm install',
      '  4. Jalankan: npm run dev',
      '',
      'Cara Build & Deploy ke Vercel / GitHub:',
      '  1. Pastikan seluruh folder src/, public/, index.html, package.json, dan vercel.json berada di root repositori GitHub.',
      '  2. Tambahkan file firebase-applet-config.json dari project Firebase Anda.',
      '  3. Jalankan: npm run build',
      '',
      'Catatan Keamanan:',
      '  - Jangan pernah mengunggah berkas .env berisi secret API key ke repositori publik.',
      '  - Tinjau file firestore.rules sebelum deploy produksi.',
    ].join('\n')
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerBlobDownload(blob, `SMANSATEKUN_SourceCode_${getDateStamp()}.zip`);
  return addedCount;
}
