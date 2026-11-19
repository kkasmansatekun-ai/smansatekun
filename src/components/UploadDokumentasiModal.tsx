import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, Trash2 } from 'lucide-react';
import {
  AuthUser,
  BULAN_INDONESIA,
  BulanIndonesia,
  DokumentasiItem,
  KATEGORI_DOKUMENTASI,
  KategoriDokumentasi,
} from '../types/smansatekun';
import { Modal } from './ui/Modal';

interface UploadDokumentasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  editingItem?: DokumentasiItem | null;
  onSave: (
    data: Omit<DokumentasiItem, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>,
    existingId?: string
  ) => void;
}

function getMonthNameFromDate(dateStr: string): BulanIndonesia {
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const idx = Number(parts[1]) - 1;
    if (idx >= 0 && idx < 12) {
      return BULAN_INDONESIA[idx];
    }
  }
  return 'November';
}

// Kompresi gambar ringan agar aman disimpan ke LocalStorage
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const maxWidth = 1080;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function UploadDokumentasiModal({
  isOpen,
  onClose,
  currentUser,
  editingItem,
  onSave,
}: UploadDokumentasiModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('2026-11-18');
  const [bulan, setBulan] = useState<BulanIndonesia>('November');
  const [kategori, setKategori] = useState<KategoriDokumentasi>('KKA');
  const [deskripsi, setDeskripsi] = useState('');
  const [imageMode, setImageMode] = useState<'file' | 'url'>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setJudul(editingItem.judul);
      setTanggal(editingItem.tanggal);
      setBulan(editingItem.bulan);
      setKategori(editingItem.kategori);
      setDeskripsi(editingItem.deskripsi);
      setImageUrl(editingItem.imageUrl);
      setImageMode(editingItem.imageUrl.startsWith('data:') ? 'file' : 'url');
    } else {
      const todayIso = new Date().toISOString().slice(0, 10);
      setJudul('');
      setTanggal(todayIso);
      setBulan(getMonthNameFromDate(todayIso));
      setKategori(
        currentUser.role === 'guru' ? 'KKA' : 'Kegiatan Sekolah'
      );
      setDeskripsi('');
      setImageUrl('');
      setImageMode('file');
    }
    setFormError('');
  }, [isOpen, editingItem, currentUser.role]);

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Mohon unggah berkas gambar (JPG, PNG, atau WebP).');
      return;
    }
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setImageUrl(dataUrl);
      setFormError('');
    } catch {
      setFormError('Terjadi kendala saat memproses gambar.');
    }
  };

  const handleDateChange = (nextDate: string) => {
    setTanggal(nextDate);
    if (nextDate) {
      setBulan(getMonthNameFromDate(nextDate));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      setFormError('Judul kegiatan wajib diisi.');
      return;
    }
    if (!deskripsi.trim()) {
      setFormError('Deskripsi singkat kegiatan wajib diisi.');
      return;
    }
    if (!imageUrl.trim()) {
      setFormError('Silakan unggah foto dokumentasi atau masukkan tautan gambar.');
      return;
    }

    onSave(
      {
        judul: judul.trim(),
        tanggal,
        bulan,
        kategori,
        deskripsi: deskripsi.trim(),
        imageUrl: imageUrl.trim(),
      },
      editingItem?.id
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Dokumentasi Kegiatan' : 'Upload Dokumentasi Kegiatan'}
      subtitle={`Pengunggah: ${currentUser.namaLengkap} (${
        currentUser.role === 'admin' ? 'Admin' : 'Guru'
      })`}
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="dok-judul" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Judul Kegiatan
          </label>
          <input
            id="dok-judul"
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Praktikum KKA Pengolahan Grafik Kelas X"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label htmlFor="dok-tanggal" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tanggal
            </label>
            <input
              id="dok-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="dok-bulan" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Bulan
            </label>
            <select
              id="dok-bulan"
              value={bulan}
              onChange={(e) => setBulan(e.target.value as BulanIndonesia)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            >
              {BULAN_INDONESIA.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dok-kategori" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Mapel / Kategori
            </label>
            <select
              id="dok-kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value as KategoriDokumentasi)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            >
              {KATEGORI_DOKUMENTASI.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="dok-deskripsi" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Deskripsi Singkat
          </label>
          <textarea
            id="dok-deskripsi"
            rows={3}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Ceritakan ringkasan pelaksanaan kegiatan atau capaian praktikum siswa..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none resize-none"
          />
        </div>

        {/* Bagian Unggah Foto Dokumentasi */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Foto Dokumentasi</span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setImageMode('file')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  imageMode === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Unggah File
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                  imageMode === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Tautan URL
              </button>
            </div>
          </div>

          {imageMode === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFilePicked(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                isDragging
                  ? 'border-[#0284C7] bg-sky-50'
                  : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleFilePicked(e.target.files?.[0])}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-[#0284C7] mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Seret & letakkan foto di sini
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Format JPG, PNG, atau WebP (otomatis dioptimalkan)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Pilih Foto dari Perangkat
              </button>
            </div>
          ) : (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Masukkan URL gambar atau path lokal (/src/assets/images/...)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          )}

          {/* Pratinjau Foto Instan */}
          {imageUrl && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={imageUrl}
                alt="Pratinjau foto dokumentasi"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                aria-label="Hapus pratinjau foto"
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-[#0F172A]/80 backdrop-blur-sm px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ganti
              </button>
            </div>
          )}
        </div>

        {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700 transition-colors"
          >
            {editingItem ? 'Simpan Perubahan' : 'Publikasikan Dokumentasi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
