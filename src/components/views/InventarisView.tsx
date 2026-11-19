import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Pencil,
  Trash2,
  HardDrive,
  Laptop,
  Monitor,
  Projector,
  TvMinimal,
  Download,
  FileSpreadsheet,
  Layers,
  Camera,
  Upload,
  Link2,
  X,
  ImageIcon,
} from 'lucide-react';
import {
  InventoryItem,
  KondisiPerangkat,
  KategoriPerangkat,
} from '../../types/smansatekun';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { exportTabularData, ExportFormat } from '../../utils/exportData';

function compressDamagePhoto(file: File, maxWidth = 720, initialQuality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl.slice(0, 185000));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl.slice(0, 185000));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = initialQuality;
        let output = canvas.toDataURL('image/jpeg', quality);
        while (output.length > 185000 && quality > 0.35) {
          quality -= 0.1;
          output = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(output);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface InventarisViewProps {
  items: InventoryItem[];
  onAdd: (item: Omit<InventoryItem, 'id' | 'terakhirDiperiksa'>) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onNotify: (pesan: string) => void;
}

const KATEGORI_CONFIG: Array<{
  key: KategoriPerangkat;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'Laptop',
    label: 'Laptop',
    subtitle: 'Perangkat portabel guru & praktikum',
    icon: Laptop,
  },
  {
    key: 'Komputer',
    label: 'Komputer',
    subtitle: 'PC workstation & klien laboratorium',
    icon: Monitor,
  },
  {
    key: 'Proyektor',
    label: 'Proyektor',
    subtitle: 'Unit proyeksi ruang belajar',
    icon: Projector,
  },
  {
    key: 'PID',
    label: 'PID',
    subtitle: 'Panel Interaktif Digital / Smartboard',
    icon: TvMinimal,
  },
];

export function InventarisView({
  items,
  onAdd,
  onUpdate,
  onDelete,
  onNotify,
}: InventarisViewProps) {
  const [selectedKategori, setSelectedKategori] = useState<'Semua' | KategoriPerangkat>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [kondisiFilter, setKondisiFilter] = useState<'Semua' | KondisiPerangkat>('Semua');

  // Modal Tambah / Edit Perangkat
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [kodeBarang, setKodeBarang] = useState('');
  const [kategori, setKategori] = useState<KategoriPerangkat>('Komputer');
  const [namaPerangkat, setNamaPerangkat] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [lokasi, setLokasi] = useState('Lab Komputer 1');
  const [kondisi, setKondisi] = useState<KondisiPerangkat>('Normal');
  const [keterangan, setKeterangan] = useState('');
  const [fotoKerusakan, setFotoKerusakan] = useState('');
  const [fotoMode, setFotoMode] = useState<'file' | 'url'>('file');
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);
  const [isProcessingFoto, setIsProcessingFoto] = useState(false);
  const [fotoError, setFotoError] = useState('');
  const [formError, setFormError] = useState('');
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Modal Detail / Sunting Keterangan
  const [noteItem, setNoteItem] = useState<InventoryItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteKondisiDraft, setNoteKondisiDraft] = useState<KondisiPerangkat>('Normal');
  const [noteFotoDraft, setNoteFotoDraft] = useState('');
  const noteFotoInputRef = useRef<HTMLInputElement>(null);

  // Modal Pratinjau Foto Kerusakan
  const [previewPhotoItem, setPreviewPhotoItem] = useState<InventoryItem | null>(null);

  // Modal Export Excel / CSV (Popup Pilihan Kondisi Normal / Rusak)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportKondisi, setExportKondisi] = useState<'Normal' | 'Rusak' | 'Semua'>('Normal');
  const [exportKategori, setExportKategori] = useState<'Semua' | KategoriPerangkat>('Semua');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');

  // Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Statistik per kategori (Laptop, Komputer, Proyektor, PID)
  const categoryStats = useMemo(() => {
    const map: Record<
      KategoriPerangkat,
      { total: number; normal: number; rusak: number }
    > = {
      Laptop: { total: 0, normal: 0, rusak: 0 },
      Komputer: { total: 0, normal: 0, rusak: 0 },
      Proyektor: { total: 0, normal: 0, rusak: 0 },
      PID: { total: 0, normal: 0, rusak: 0 },
    };

    for (const item of items) {
      const target = map[item.kategori];
      if (!target) continue;
      target.total += 1;
      if (item.kondisi === 'Normal') {
        target.normal += 1;
      } else {
        target.rusak += 1;
      }
    }
    return map;
  }, [items]);

  // Item dalam kategori aktif
  const itemsInKategori = useMemo(() => {
    if (selectedKategori === 'Semua') return items;
    return items.filter((item) => item.kategori === selectedKategori);
  }, [items, selectedKategori]);

  // Ringkasan 3 Kartu Utama mengikuti kategori yang dipilih
  const summary = useMemo(() => {
    const normal = itemsInKategori.filter((i) => i.kondisi === 'Normal').length;
    const rusak = itemsInKategori.filter((i) => i.kondisi === 'Rusak').length;
    return { total: itemsInKategori.length, normal, rusak };
  }, [itemsInKategori]);

  // Item tersaring untuk tabel
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return itemsInKategori.filter((item) => {
      const matchKondisi = kondisiFilter === 'Semua' || item.kondisi === kondisiFilter;
      const matchSearch =
        !q ||
        item.kodeBarang.toLowerCase().includes(q) ||
        item.namaPerangkat.toLowerCase().includes(q) ||
        item.spesifikasi.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q) ||
        item.keterangan.toLowerCase().includes(q);
      return matchKondisi && matchSearch;
    });
  }, [itemsInKategori, searchQuery, kondisiFilter]);

  // Hitung pratinjau data yang akan di-export
  const exportPreviewItems = useMemo(() => {
    return items.filter((item) => {
      const matchKat = exportKategori === 'Semua' || item.kategori === exportKategori;
      const matchKond = exportKondisi === 'Semua' || item.kondisi === exportKondisi;
      return matchKat && matchKond;
    });
  }, [items, exportKategori, exportKondisi]);

  const exportCountsByKondisi = useMemo(() => {
    const scoped =
      exportKategori === 'Semua'
        ? items
        : items.filter((item) => item.kategori === exportKategori);
    return {
      normal: scoped.filter((i) => i.kondisi === 'Normal').length,
      rusak: scoped.filter((i) => i.kondisi === 'Rusak').length,
      semua: scoped.length,
    };
  }, [items, exportKategori]);

  const openAddModal = () => {
    setEditingItem(null);
    setKodeBarang('');
    setKategori(selectedKategori === 'Semua' ? 'Komputer' : selectedKategori);
    setNamaPerangkat('');
    setSpesifikasi('');
    setLokasi('Lab Komputer 1');
    setKondisi('Normal');
    setKeterangan('');
    setFotoKerusakan('');
    setFotoMode('file');
    setFotoError('');
    setIsDraggingFoto(false);
    setFormError('');
    setFormModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setKodeBarang(item.kodeBarang);
    setKategori(item.kategori);
    setNamaPerangkat(item.namaPerangkat);
    setSpesifikasi(item.spesifikasi);
    setLokasi(item.lokasi);
    setKondisi(item.kondisi);
    setKeterangan(item.keterangan);
    setFotoKerusakan(item.fotoKerusakan ?? '');
    setFotoMode(item.fotoKerusakan?.startsWith('http') ? 'url' : 'file');
    setFotoError('');
    setIsDraggingFoto(false);
    setFormError('');
    setFormModalOpen(true);
  };

  const openNoteModal = (item: InventoryItem) => {
    setNoteItem(item);
    setNoteDraft(item.keterangan);
    setNoteKondisiDraft(item.kondisi);
    setNoteFotoDraft(item.fotoKerusakan ?? '');
  };

  const handleFotoFileSelect = async (file: File | null | undefined, target: 'form' | 'note') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFotoError('Format berkas tidak didukung. Pilih gambar berformat JPG, PNG, atau WEBP.');
      return;
    }
    setFotoError('');
    setIsProcessingFoto(true);
    try {
      const compressed = await compressDamagePhoto(file);
      if (target === 'form') {
        setFotoKerusakan(compressed);
      } else {
        setNoteFotoDraft(compressed);
      }
    } catch {
      setFotoError('Gagal memproses gambar. Silakan coba lagi dengan foto lain.');
    } finally {
      setIsProcessingFoto(false);
    }
  };

  const openExportModal = () => {
    setExportKategori(selectedKategori);
    setExportKondisi(kondisiFilter === 'Rusak' ? 'Rusak' : 'Normal');
    setExportFormat('excel');
    setExportModalOpen(true);
  };

  const handleConfirmExport = () => {
    if (exportPreviewItems.length === 0) return;

    const katLabel = exportKategori === 'Semua' ? 'Semua_Kategori' : exportKategori;
    const kondLabel = exportKondisi === 'Semua' ? 'Semua_Kondisi' : `Kondisi_${exportKondisi}`;

    exportTabularData({
      title: `Inventaris Labor Komputer SMANSATEKUN (${
        exportKategori === 'Semua' ? 'Semua Kategori' : exportKategori
      } - ${exportKondisi === 'Semua' ? 'Semua Kondisi' : `Kondisi ${exportKondisi}`})`,
      filenameBase: `Inventaris_SMANSATEKUN_${katLabel}_${kondLabel}`,
      headers: [
        'No',
        'Kode Barang',
        'Kategori',
        'Nama Perangkat',
        'Spesifikasi / Merk',
        'Lokasi',
        'Kondisi',
        'Keterangan',
        'Terakhir Diperiksa',
      ],
      rows: exportPreviewItems.map((item, idx) => [
        idx + 1,
        item.kodeBarang,
        item.kategori,
        item.namaPerangkat,
        item.spesifikasi,
        item.lokasi,
        item.kondisi,
        item.keterangan,
        item.terakhirDiperiksa,
      ]),
      format: exportFormat,
    });

    onNotify(
      `Berhasil mengunduh ${exportPreviewItems.length} data inventaris (${
        exportKondisi === 'Semua' ? 'Normal & Rusak' : `Kondisi ${exportKondisi}`
      }) dalam format ${exportFormat === 'excel' ? 'Excel' : 'CSV'}.`
    );
    setExportModalOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeBarang.trim() || !namaPerangkat.trim() || !spesifikasi.trim()) {
      setFormError('Kode Barang, Nama Perangkat, dan Spesifikasi wajib diisi.');
      return;
    }

    const cleanedFoto = fotoKerusakan.trim() || undefined;

    if (editingItem) {
      onUpdate({
        ...editingItem,
        kodeBarang: kodeBarang.trim().toUpperCase(),
        kategori,
        namaPerangkat: namaPerangkat.trim(),
        spesifikasi: spesifikasi.trim(),
        lokasi: lokasi.trim() || 'Lab Komputer 1',
        kondisi,
        keterangan: keterangan.trim() || 'Tidak ada catatan tambahan.',
        fotoKerusakan: cleanedFoto,
        terakhirDiperiksa: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      });
    } else {
      onAdd({
        kodeBarang: kodeBarang.trim().toUpperCase(),
        kategori,
        namaPerangkat: namaPerangkat.trim(),
        spesifikasi: spesifikasi.trim(),
        lokasi: lokasi.trim() || 'Lab Komputer 1',
        kondisi,
        keterangan: keterangan.trim() || 'Perangkat baru dicatat ke dalam inventaris.',
        fotoKerusakan: cleanedFoto,
      });
    }

    setFormModalOpen(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteItem) return;
    onUpdate({
      ...noteItem,
      kondisi: noteKondisiDraft,
      keterangan: noteDraft.trim() || 'Tidak ada catatan tambahan.',
      fotoKerusakan: noteFotoDraft.trim() || undefined,
      terakhirDiperiksa: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });
    setNoteItem(null);
  };

  const handleInlineKondisiChange = (item: InventoryItem, nextKondisi: KondisiPerangkat) => {
    onUpdate({
      ...item,
      kondisi: nextKondisi,
      terakhirDiperiksa: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Inventaris Perangkat Labor Komputer
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola aset per kategori (Laptop, Komputer, Proyektor, PID) beserta kondisi kelayakan dan ekspor laporan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={openExportModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export Excel / CSV
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Perangkat
          </button>
        </div>
      </div>

      {/* Menu Kategori Perangkat: Laptop, Komputer, Proyektor, PID (masing-masing dengan Total, Normal, Rusak) */}
      <section aria-label="Menu kategori perangkat">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500">
            Pilih Menu Kategori Perangkat
          </p>
          {selectedKategori !== 'Semua' && (
            <button
              type="button"
              onClick={() => setSelectedKategori('Semua')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-sky-800 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Tampilkan Semua Kategori
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KATEGORI_CONFIG.map((kat) => {
            const Icon = kat.icon;
            const st = categoryStats[kat.key];
            const isSelected = selectedKategori === kat.key;

            return (
              <button
                key={kat.key}
                type="button"
                onClick={() =>
                  setSelectedKategori((prev) => (prev === kat.key ? 'Semua' : kat.key))
                }
                className={`text-left rounded-2xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] ${
                  isSelected
                    ? 'bg-sky-50/70 border-[#0284C7] ring-1 ring-[#0284C7]/25'
                    : 'bg-white border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`text-base font-bold ${
                        isSelected ? 'text-[#0F172A]' : 'text-slate-900'
                      }`}
                    >
                      {kat.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                      {kat.subtitle}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#0284C7] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Detail Total Perangkat, Kondisi Normal, Kondisi Rusak per Menu */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[11px] text-slate-500">Total</p>
                    <p className="mt-0.5 text-base font-bold font-mono text-slate-900 tabular-nums">
                      {st.total}
                    </p>
                  </div>
                  <div className="border-x border-slate-200/70">
                    <p className="text-[11px] text-emerald-700">Normal</p>
                    <p className="mt-0.5 text-base font-bold font-mono text-emerald-600 tabular-nums">
                      {st.normal}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-red-600">Rusak</p>
                    <p className="mt-0.5 text-base font-bold font-mono text-red-600 tabular-nums">
                      {st.rusak}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 Kartu Statistik Ringkasan Kategori Aktif */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Total Perangkat {selectedKategori !== 'Semua' ? `(${selectedKategori})` : '(Semua)'}
            </p>
            <p className="mt-2 text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {summary.total}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {selectedKategori === 'Semua'
                ? 'Seluruh unit terdaftar di laboratorium'
                : `Unit kategori ${selectedKategori} terdaftar`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Kondisi Normal</p>
            <p className="mt-2 text-3xl font-bold font-mono text-emerald-600 tabular-nums">
              {summary.normal}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              {summary.total > 0 ? Math.round((summary.normal / summary.total) * 100) : 0}% siap digunakan
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Kondisi Rusak</p>
            <p className="mt-2 text-3xl font-bold font-mono text-red-600 tabular-nums">
              {summary.rusak}
            </p>
            <p className="mt-1 text-xs text-red-600/80">
              Memerlukan perbaikan / penggantian
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Kondisi & Pencarian */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 self-start"
            role="tablist"
            aria-label="Filter kondisi perangkat"
          >
            {(['Semua', 'Normal', 'Rusak'] as const).map((tab) => {
              const count =
                tab === 'Semua'
                  ? summary.total
                  : tab === 'Normal'
                  ? summary.normal
                  : summary.rusak;
              const isActive = kondisiFilter === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setKondisiFilter(tab)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}{' '}
                  <span className="ml-1 font-mono text-slate-400 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode barang, nama, atau merk..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
          />
        </div>
      </div>

      {/* Tabel Inventaris */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-5">Kode Barang</th>
                <th className="py-3.5 px-4">Nama Perangkat</th>
                <th className="py-3.5 px-4">Spesifikasi / Merk</th>
                <th className="py-3.5 px-4">Kondisi</th>
                <th className="py-3.5 px-4">Keterangan & Foto</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-5 text-center text-slate-500">
                    Tidak ada perangkat yang cocok dengan kategori atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isNormal = item.kondisi === 'Normal';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 align-top whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-[#0284C7]">
                          {item.kodeBarang}
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {item.kategori} · {item.lokasi}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-semibold text-slate-900">{item.namaPerangkat}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Diperiksa: {item.terakhirDiperiksa}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs text-slate-600 max-w-xs leading-relaxed">
                        {item.spesifikasi}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isNormal ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <select
                            aria-label={`Ubah kondisi ${item.namaPerangkat}`}
                            value={item.kondisi}
                            onChange={(e) =>
                              handleInlineKondisiChange(item, e.target.value as KondisiPerangkat)
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 transition-colors ${
                              isNormal
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <option value="Normal" className="bg-white text-slate-900">
                              Normal
                            </option>
                            <option value="Rusak" className="bg-white text-slate-900">
                              Rusak
                            </option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-[260px]">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.keterangan}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openNoteModal(item)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-sky-800 transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Keterangan
                          </button>
                          {item.fotoKerusakan && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoItem(item)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors whitespace-nowrap"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Foto Kerusakan
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#0284C7] hover:border-sky-200 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popup Export Excel / CSV (Pilih Kondisi Normal atau Rusak) */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Data Inventaris"
        subtitle="Pilih kondisi perangkat dan format berkas sebelum mengunduh laporan inventaris."
      >
        <div className="space-y-5">
          {/* Pilihan Kondisi: Normal / Rusak / Semua */}
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2.5">
              Pilih Kondisi Perangkat yang Diunduh
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setExportKondisi('Normal')}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  exportKondisi === 'Normal'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">Kondisi Normal</span>
                </div>
                <p className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {exportCountsByKondisi.normal}
                  <span className="ml-1 text-xs font-sans font-normal text-slate-500">unit</span>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportKondisi('Rusak')}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  exportKondisi === 'Rusak'
                    ? 'border-red-500 bg-red-50/70 ring-1 ring-red-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold">Kondisi Rusak</span>
                </div>
                <p className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {exportCountsByKondisi.rusak}
                  <span className="ml-1 text-xs font-sans font-normal text-slate-500">unit</span>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportKondisi('Semua')}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  exportKondisi === 'Semua'
                    ? 'border-[#0284C7] bg-sky-50/70 ring-1 ring-[#0284C7]/25'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[#0284C7]">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold">Semua Kondisi</span>
                </div>
                <p className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {exportCountsByKondisi.semua}
                  <span className="ml-1 text-xs font-sans font-normal text-slate-500">unit</span>
                </p>
              </button>
            </div>
          </div>

          {/* Kategori & Format Berkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="export-inv-kat"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Cakupan Kategori
              </label>
              <select
                id="export-inv-kat"
                value={exportKategori}
                onChange={(e) =>
                  setExportKategori(e.target.value as 'Semua' | KategoriPerangkat)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                {KATEGORI_CONFIG.map((kat) => (
                  <option key={kat.key} value={kat.key}>
                    {kat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="block text-sm font-semibold text-slate-700 mb-1.5">
                Format File
              </p>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    exportFormat === 'excel'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel (.xls)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    exportFormat === 'csv'
                      ? 'bg-white text-[#0284C7] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  CSV (.csv)
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
            {exportPreviewItems.length > 0 ? (
              <span>
                Siap mengunduh{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  {exportPreviewItems.length} perangkat
                </strong>{' '}
                ({exportKategori === 'Semua' ? 'Semua Kategori' : exportKategori} ·{' '}
                {exportKondisi === 'Semua' ? 'Normal & Rusak' : `Kondisi ${exportKondisi}`}).
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Tidak ada data perangkat pada kombinasi kategori dan kondisi yang dipilih.
              </span>
            )}
          </div>

          <div className="pt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={exportPreviewItems.length === 0}
              onClick={handleConfirmExport}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Unduh {exportFormat === 'excel' ? 'Excel' : 'CSV'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Tambah / Edit Perangkat */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingItem ? 'Edit Data Perangkat' : 'Tambah Perangkat Laboratorium'}
        subtitle="Catat rincian kategori, spesifikasi, status kondisi, dan foto kerusakan perangkat."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-kode" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kode Barang
              </label>
              <input
                id="inv-kode"
                type="text"
                value={kodeBarang}
                onChange={(e) => setKodeBarang(e.target.value)}
                placeholder="LAB-LPT-005"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono uppercase text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inv-kategori" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kategori
              </label>
              <select
                id="inv-kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriPerangkat)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#0284C7] focus:outline-none"
              >
                {KATEGORI_CONFIG.map((kat) => (
                  <option key={kat.key} value={kat.key}>
                    {kat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inv-kondisi" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kondisi
              </label>
              <select
                id="inv-kondisi"
                value={kondisi}
                onChange={(e) => setKondisi(e.target.value as KondisiPerangkat)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#0284C7] focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-nama" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nama Perangkat
              </label>
              <input
                id="inv-nama"
                type="text"
                value={namaPerangkat}
                onChange={(e) => setNamaPerangkat(e.target.value)}
                placeholder="Contoh: Laptop Pengajar #05"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inv-lokasi" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Lokasi Penempatan
              </label>
              <input
                id="inv-lokasi"
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Contoh: Lab Komputer 1"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="inv-spek" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Spesifikasi / Merk
            </label>
            <input
              id="inv-spek"
              type="text"
              value={spesifikasi}
              onChange={(e) => setSpesifikasi(e.target.value)}
              placeholder="Contoh: Lenovo ThinkCentre · Intel Core i5, 16GB RAM, 512GB SSD"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="inv-ket" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Keterangan / Catatan Kondisi
            </label>
            <textarea
              id="inv-ket"
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Tuliskan catatan pemeriksaan, riwayat servis, atau detail kerusakan..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none resize-none"
            />
          </div>

          {/* Menu Foto Kerusakan */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0284C7]" />
                <span className="text-sm font-semibold text-slate-800">Foto Kerusakan</span>
                <span className="text-[11px] text-slate-500">
                  {kondisi === 'Rusak' ? '· Disarankan melampirkan bukti foto' : '· Opsional'}
                </span>
              </div>

              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setFotoMode('file')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    fotoMode === 'file'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Unggah Foto
                </button>
                <button
                  type="button"
                  onClick={() => setFotoMode('url')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    fotoMode === 'url'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  Tautan URL
                </button>
              </div>
            </div>

            {fotoMode === 'file' ? (
              <div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    void handleFotoFileSelect(selected, 'form');
                    e.target.value = '';
                  }}
                />

                {fotoKerusakan ? (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={fotoKerusakan}
                      alt="Pratinjau foto kerusakan perangkat"
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-600 truncate">
                        Foto kerusakan terlampir
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fotoInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-sky-800"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => setFotoKerusakan('')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          <X className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fotoInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fotoInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFoto(true);
                    }}
                    onDragLeave={() => setIsDraggingFoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFoto(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      void handleFotoFileSelect(droppedFile, 'form');
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
                      isDraggingFoto
                        ? 'border-[#0284C7] bg-sky-50'
                        : 'border-slate-300 bg-white hover:border-[#0284C7] hover:bg-sky-50/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center mb-2">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      {isProcessingFoto
                        ? 'Memproses foto kerusakan...'
                        : 'Klik untuk unggah foto kerusakan atau seret berkas ke sini'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Format JPG, PNG, atau WEBP (dikompresi otomatis)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    id="inv-foto-url"
                    type="url"
                    value={fotoKerusakan}
                    onChange={(e) => setFotoKerusakan(e.target.value)}
                    placeholder="https://contoh.sch.id/foto-kerusakan.jpg"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0284C7] focus:outline-none"
                  />
                  {fotoKerusakan && (
                    <button
                      type="button"
                      onClick={() => setFotoKerusakan('')}
                      aria-label="Hapus tautan foto"
                      className="p-2 rounded-xl border border-slate-300 bg-white text-slate-500 hover:text-red-600 hover:border-red-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {fotoKerusakan && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={fotoKerusakan}
                      alt="Pratinjau foto kerusakan dari tautan"
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {fotoError && <p className="text-xs font-medium text-red-600">{fotoError}</p>}
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isProcessingFoto}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700 disabled:opacity-60 transition-colors"
            >
              {editingItem ? 'Simpan Perubahan' : 'Simpan Perangkat'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail & Pembaruan Keterangan */}
      <Modal
        isOpen={Boolean(noteItem)}
        onClose={() => setNoteItem(null)}
        title={noteItem ? `Keterangan · ${noteItem.namaPerangkat}` : ''}
        subtitle={
          noteItem
            ? `${noteItem.kodeBarang} · ${noteItem.kategori} · ${noteItem.lokasi} · Diperiksa ${noteItem.terakhirDiperiksa}`
            : undefined
        }
      >
        {noteItem && (
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Spesifikasi:</span>{' '}
              {noteItem.spesifikasi}
            </div>

            <div>
              <label
                htmlFor="note-kondisi"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Status Kondisi
              </label>
              <select
                id="note-kondisi"
                value={noteKondisiDraft}
                onChange={(e) => setNoteKondisiDraft(e.target.value as KondisiPerangkat)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#0284C7] focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Rusak">Rusak</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="note-textarea"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Catatan Keterangan Perangkat
              </label>
              <textarea
                id="note-textarea"
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Masukkan detail kondisi, suku cadang yang dibutuhkan, atau riwayat perbaikan..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none resize-none"
              />
            </div>

            {/* Lampiran Foto Kerusakan pada Modal Keterangan */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Camera className="w-3.5 h-3.5 text-[#0284C7]" />
                  Foto Kerusakan
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={noteFotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      void handleFotoFileSelect(selected, 'note');
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => noteFotoInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-sky-800"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {noteFotoDraft ? 'Ganti Foto' : 'Unggah Foto'}
                  </button>
                  {noteFotoDraft && (
                    <button
                      type="button"
                      onClick={() => setNoteFotoDraft('')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      <X className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {noteFotoDraft ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={noteFotoDraft}
                    alt={`Foto kerusakan ${noteItem.namaPerangkat}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-44 object-cover"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Belum ada foto kerusakan yang dilampirkan untuk perangkat ini.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNoteItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700 transition-colors"
              >
                Perbarui Keterangan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Pratinjau Foto Kerusakan */}
      <Modal
        isOpen={Boolean(previewPhotoItem)}
        onClose={() => setPreviewPhotoItem(null)}
        title={previewPhotoItem ? `Foto Kerusakan · ${previewPhotoItem.namaPerangkat}` : ''}
        subtitle={
          previewPhotoItem
            ? `${previewPhotoItem.kodeBarang} · ${previewPhotoItem.kategori} · ${previewPhotoItem.lokasi}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {previewPhotoItem && previewPhotoItem.fotoKerusakan && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5">
              <img
                src={previewPhotoItem.fotoKerusakan}
                alt={`Foto kerusakan ${previewPhotoItem.namaPerangkat}`}
                referrerPolicy="no-referrer"
                className="w-full max-h-[60vh] object-contain bg-slate-100"
              />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
              <p>
                <span className="font-semibold text-slate-800">Kondisi:</span>{' '}
                <span
                  className={
                    previewPhotoItem.kondisi === 'Normal'
                      ? 'font-bold text-emerald-700'
                      : 'font-bold text-red-700'
                  }
                >
                  {previewPhotoItem.kondisi}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Keterangan:</span>{' '}
                {previewPhotoItem.keterangan}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = previewPhotoItem;
                  setPreviewPhotoItem(null);
                  openEditModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0284C7] bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Perangkat
              </button>
              <button
                type="button"
                onClick={() => setPreviewPhotoItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
        }}
        title="Hapus Perangkat dari Inventaris"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus "${deleteTarget.namaPerangkat}" (${deleteTarget.kodeBarang}) dari daftar inventaris?`
            : ''
        }
      />
    </div>
  );
}
