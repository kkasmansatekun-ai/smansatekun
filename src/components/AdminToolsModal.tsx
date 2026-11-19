import React, { useState } from 'react';
import {
  Database,
  FileArchive,
  FileJson,
  ShieldCheck,
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle2,
  Lock,
  AlertCircle,
  Download,
} from 'lucide-react';
import { ApprovedStaffItem, AuthUser } from '../types/smansatekun';
import {
  DatabaseBackupPayload,
  downloadDatabaseBackupJson,
  downloadDatabaseBackupZip,
  downloadProjectSourceZip,
} from '../utils/adminExport';
import { isValidEmailFormat } from '../utils/security';
import { Modal } from './ui/Modal';

interface AdminToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  backupPayload: DatabaseBackupPayload;
  approvedStaff: ApprovedStaffItem[];
  onAddApprovedStaff: (data: { email: string; nama: string; jabatan: string }) => Promise<void>;
  onRemoveApprovedStaff: (staffKey: string) => Promise<void>;
  onNotify: (pesan: string, tipe?: 'sukses' | 'info' | 'peringatan') => void;
}

type AdminTab = 'backup' | 'zip' | 'keamanan';

const SECURITY_FEATURES = [
  {
    judul: 'Firestore Zero-Trust & Whitelist Email Guru',
    deskripsi:
      'Hanya Admin dan email Guru terdaftar yang dapat menulis ke database; akun Google luar otomatis diblokir di sisi server.',
  },
  {
    judul: 'Anti-XSS & Validasi Domain Ketat',
    deskripsi:
      'Menyaring tag HTML, protokol berbahaya (javascript:/data:image/svg+xml), dan memvalidasi tautan Instagram wajib dari domain instagram.com.',
  },
  {
    judul: 'Anti-Formula Injection CSV/Excel',
    deskripsi:
      'Seluruh ekspor inventaris, permintaan, dan backup CSV menetralkan awalan berbahaya (=, +, -, @) sebelum dibuka di Excel.',
  },
  {
    judul: 'Rate-Limiter & HTTP Security Headers',
    deskripsi:
      'Pembatasan frekuensi penulisan di klien serta header HSTS, X-Content-Type-Options, Referrer-Policy, dan Permissions-Policy pada konfigurasi produksi.',
  },
];

export function AdminToolsModal({
  isOpen,
  onClose,
  currentUser,
  backupPayload,
  approvedStaff,
  onAddApprovedStaff,
  onRemoveApprovedStaff,
  onNotify,
}: AdminToolsModalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('backup');
  const [isDownloadingDbZip, setIsDownloadingDbZip] = useState(false);
  const [isDownloadingSrcZip, setIsDownloadingSrcZip] = useState(false);
  const [lastZipFileCount, setLastZipFileCount] = useState<number | null>(null);

  // Form Tambah Email Guru Terverifikasi
  const [staffEmail, setStaffEmail] = useState('');
  const [staffNama, setStaffNama] = useState('');
  const [staffJabatan, setStaffJabatan] = useState('Guru Pengampu');
  const [staffError, setStaffError] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  if (currentUser.role !== 'admin') return null;

  const handleDownloadJson = () => {
    try {
      downloadDatabaseBackupJson(backupPayload);
      onNotify('Backup database format JSON berhasil diunduh.');
    } catch {
      onNotify('Gagal membuat berkas backup JSON.', 'peringatan');
    }
  };

  const handleDownloadDbZip = async () => {
    setIsDownloadingDbZip(true);
    try {
      await downloadDatabaseBackupZip(backupPayload);
      onNotify('Paket Backup Database lengkap (.zip) berhasil diunduh.');
    } catch {
      onNotify('Gagal membuat arsip ZIP backup database.', 'peringatan');
    } finally {
      setIsDownloadingDbZip(false);
    }
  };

  const handleDownloadSourceZip = async () => {
    setIsDownloadingSrcZip(true);
    try {
      const count = await downloadProjectSourceZip();
      setLastZipFileCount(count);
      onNotify(`ZIP Kode Sumber SMANSATEKUN (${count} berkas) berhasil diunduh.`);
    } catch {
      onNotify('Gagal mengemas ZIP kode sumber proyek.', 'peringatan');
    } finally {
      setIsDownloadingSrcZip(false);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!isValidEmailFormat(cleanEmail)) {
      setStaffError('Masukkan alamat email Google yang valid (contoh: guru@gmail.com).');
      return;
    }
    if (!staffNama.trim()) {
      setStaffError('Nama lengkap guru wajib diisi.');
      return;
    }

    setIsSavingStaff(true);
    try {
      await onAddApprovedStaff({
        email: cleanEmail,
        nama: staffNama.trim(),
        jabatan: staffJabatan.trim() || 'Guru Pengampu',
      });
      setStaffEmail('');
      setStaffNama('');
      setStaffJabatan('Guru Pengampu');
    } catch {
      setStaffError('Gagal menyimpan email guru. Periksa koneksi dan coba kembali.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const collectionStats = [
    { label: 'Galeri Dokumentasi', count: backupPayload.counts.dokumentasi },
    { label: 'Postingan Instagram', count: backupPayload.counts.instagramPosts },
    { label: 'Berita Media', count: backupPayload.counts.berita },
    { label: 'Struktur Jabatan', count: backupPayload.counts.jabatan },
    { label: 'Mata Pelajaran LMS', count: backupPayload.counts.lmsCourses },
    { label: 'Data Poin Murid', count: backupPayload.counts.poinMurid },
    { label: 'Inventaris Lab', count: backupPayload.counts.inventaris },
    { label: 'Permintaan Perangkat', count: backupPayload.counts.permintaan },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Panel Admin: Backup, ZIP Kode & Keamanan"
      subtitle="Menu khusus Administrator untuk mencadangkan database, mengunduh kode sumber, dan mengelola akses guru."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Tab Navigasi Panel Admin */}
        <div
          className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5"
          role="tablist"
          aria-label="Menu Alat Admin"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'backup'}
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'backup'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>Backup Database</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zip'}
            onClick={() => setActiveTab('zip')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'zip'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5 shrink-0" />
            <span>Download ZIP Kode</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'keamanan'}
            onClick={() => setActiveTab('keamanan')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'keamanan'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Keamanan & Guru</span>
          </button>
        </div>

        {/* TAB 1: BACKUP DATABASE */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-bold text-[#0F172A]">
                  Ringkasan Koleksi Firebase Firestore Aktif
                </p>
                <span className="font-mono text-[11px] text-slate-500">
                  {backupPayload.firebaseProjectId}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {collectionStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-white border border-slate-200/80 px-3 py-2.5"
                  >
                    <p className="text-[11px] text-slate-500 truncate">{stat.label}</p>
                    <p className="mt-0.5 text-lg font-bold font-mono tabular-nums text-[#0F172A]">
                      {stat.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-[#0284C7] hover:bg-sky-50/40 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 text-[#0284C7] shrink-0">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0F172A]">Unduh Backup JSON</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Salinan mentah seluruh 8 koleksi Firestore untuk arsip cepat & pemulihan data.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={isDownloadingDbZip}
                onClick={handleDownloadDbZip}
                className="flex items-start gap-3 rounded-2xl border border-[#0284C7]/40 bg-[#0F172A] p-4 text-left text-white hover:bg-[#0284C7] disabled:opacity-60 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-sky-300 shrink-0">
                  {isDownloadingDbZip ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {isDownloadingDbZip ? 'Mengemas Arsip ZIP...' : 'Unduh Backup Lengkap (.zip)'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                    Berisi JSON lengkap + 6 file CSV siap buka di Excel + panduan restore.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DOWNLOAD ZIP KODE SUMBER */}
        {activeTab === 'zip' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0284C7] text-white shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Unduh Paket Lengkap Kode Sumber SMANSATEKUN (.zip)
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Mengemas seluruh folder <code className="font-mono text-[#0284C7]">src/</code>,{' '}
                    <code className="font-mono text-[#0284C7]">index.html</code>,{' '}
                    <code className="font-mono text-[#0284C7]">package.json</code>,{' '}
                    <code className="font-mono text-[#0284C7]">vite.config.ts</code>,{' '}
                    <code className="font-mono text-[#0284C7]">vercel.json</code>,{' '}
                    <code className="font-mono text-[#0284C7]">firestore.rules</code>, serta panduan
                    deploy GitHub/Vercel.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Aman dibagikan: berkas <code className="font-mono">.env</code> / rahasia lokal
                  otomatis dikecualikan dari arsip ZIP.
                </span>
              </div>
            </div>

            {lastZipFileCount !== null && (
              <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900">
                <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>
                  Terakhir diunduh: <strong>{lastZipFileCount} berkas</strong> kode & konfigurasi
                  terkemas rapi di dalam folder <code className="font-mono">SMANSATEKUN/</code>.
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={isDownloadingSrcZip}
              onClick={handleDownloadSourceZip}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-colors shadow-xs"
            >
              {isDownloadingSrcZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan Arsip Kode Sumber...
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  Unduh ZIP Kode Sumber SMANSATEKUN
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 3: KEAMANAN & DAFTAR EMAIL GURU */}
        {activeTab === 'keamanan' && (
          <div className="space-y-5">
            {/* Form Whitelist Email Guru */}
            <form
              onSubmit={handleAddStaffSubmit}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#0284C7]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Daftar Email Guru Terverifikasi (Whitelist)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tambahkan email Google guru SMAN 1 Teluk Kuantan agar dapat mengunggah dokumentasi,
                postingan Instagram, dan memperbarui data lab. Akun Google di luar daftar ini tidak
                dapat mengubah database.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="Email Google Guru (contoh: nama@gmail.com)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
                <input
                  type="text"
                  value={staffNama}
                  onChange={(e) => setStaffNama(e.target.value)}
                  placeholder="Nama Lengkap Guru"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={staffJabatan}
                  onChange={(e) => setStaffJabatan(e.target.value)}
                  placeholder="Jabatan / Mapel (contoh: Guru Informatika)"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0284C7] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {isSavingStaff ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Izinkan Guru
                </button>
              </div>

              {staffError && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{staffError}</span>
                </div>
              )}
            </form>

            {/* Daftar Guru yang Diizinkan */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#0F172A]">
                Guru Aktif dalam Whitelist ({approvedStaff.length})
              </p>
              {approvedStaff.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                  Belum ada email guru ditambahkan. Saat ini hanya akun Admin yang memiliki izin
                  tulis ke database Firebase.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {approvedStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{staff.nama}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {staff.email} · {staff.jabatan}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveApprovedStaff(staff.id)}
                        title={`Cabut akses ${staff.email}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                        Cabut
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ringkasan Proteksi Keamanan Aktif */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#0F172A]">Lapisan Keamanan Aktif</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SECURITY_FEATURES.map((feat) => (
                  <div
                    key={feat.judul}
                    className="rounded-xl border border-slate-200 bg-white p-3 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat.judul}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{feat.deskripsi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
