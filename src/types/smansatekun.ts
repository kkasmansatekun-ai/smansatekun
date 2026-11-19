export type MenuKey =
  | 'galeri'
  | 'struktur'
  | 'lms'
  | 'poin'
  | 'inventaris'
  | 'permintaan';

export type UserRole = 'guest' | 'guru' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  namaLengkap: string;
  jabatan: string;
  role: UserRole;
  mataPelajaran?: string;
  loginAt: string;
}

export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export type BulanIndonesia = (typeof BULAN_INDONESIA)[number];

export const KATEGORI_DOKUMENTASI = [
  'Kegiatan Sekolah',
  'KKA',
  'Informatika',
  'Praktikum Arduino/IoT',
  'OSN',
  'Jaringan Komputer',
  'Desain Grafis',
] as const;

export type KategoriDokumentasi = (typeof KATEGORI_DOKUMENTASI)[number];

export interface DokumentasiItem {
  id: string;
  judul: string;
  kategori: KategoriDokumentasi;
  bulan: BulanIndonesia;
  tanggal: string; // format YYYY-MM-DD
  deskripsi: string;
  imageUrl: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'admin' | 'guru';
}

export interface BeritaItem {
  id: string;
  judul: string;
  sumber: string;
  tanggal: string;
  ringkasan: string;
  url: string;
  thumbnailUrl: string;
}

export type TingkatHirarki =
  | 'Pimpinan'
  | 'Koordinator & Teknisi'
  | 'Asisten & Operasional';

export interface JabatanItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  tingkat: TingkatHirarki;
  tugasPokok: string;
  avatarUrl?: string;
}

export type KelasLevel = 'Kelas X' | 'Kelas XI' | 'Kelas XII';

export interface LmsModule {
  id: string;
  judul: string;
  durasi: string;
  ringkasan: string;
  selesai: boolean;
}

export interface LmsAssignment {
  id: string;
  judul: string;
  tenggat: string;
  terkumpul: number;
  totalMurid: number;
  status: 'Aktif' | 'Selesai';
}

export interface LmsCourse {
  id: string;
  kode: string;
  nama: string;
  kelas: KelasLevel;
  guruPengampu: string;
  ruangLab: string;
  jadwal: string;
  deskripsi: string;
  modul: LmsModule[];
  tugas: LmsAssignment[];
}

export interface PointLog {
  id: string;
  tanggal: string;
  jenis: 'prestasi' | 'pelanggaran';
  poin: number;
  catatan: string;
}

export interface StudentPoint {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  poinPrestasi: number;
  poinPelanggaran: number;
  riwayat: PointLog[];
}

export type KondisiPerangkat = 'Normal' | 'Rusak';
export type KategoriPerangkat = 'Laptop' | 'Komputer' | 'Proyektor' | 'PID';

export interface InventoryItem {
  id: string;
  kodeBarang: string;
  kategori: KategoriPerangkat;
  namaPerangkat: string;
  spesifikasi: string;
  lokasi: string;
  kondisi: KondisiPerangkat;
  keterangan: string;
  fotoKerusakan?: string;
  terakhirDiperiksa: string;
}

export type TahunAnggaran = 2025 | 2026 | 2027;
export type UrgensiLevel = 'Tinggi' | 'Sedang' | 'Rendah';
export type StatusPermintaan = 'Disetujui' | 'Diproses' | 'Menunggu' | 'Ditolak';

export interface ProcurementRequest {
  id: string;
  namaPerangkat: string;
  spesifikasiSingkat: string;
  jumlah: number;
  estimasiHarga: number;
  urgensi: UrgensiLevel;
  status: StatusPermintaan;
  tahunAnggaran: TahunAnggaran;
  pengusul: string;
}

export interface ToastMessage {
  id: string;
  pesan: string;
  tipe: 'sukses' | 'info' | 'peringatan';
}
