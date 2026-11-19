import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CalendarRange,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  ProcurementRequest,
  TahunAnggaran,
  UrgensiLevel,
  StatusPermintaan,
} from '../../types/smansatekun';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { exportTabularData, ExportFormat } from '../../utils/exportData';

interface PermintaanViewProps {
  requests: ProcurementRequest[];
  onAdd: (req: Omit<ProcurementRequest, 'id'>) => void;
  onUpdate: (req: ProcurementRequest) => void;
  onDelete: (id: string) => void;
  onNotify: (pesan: string) => void;
}

const TAHUN_OPTIONS: TahunAnggaran[] = [2025, 2026, 2027];
const URGENSI_OPTIONS: UrgensiLevel[] = ['Tinggi', 'Sedang', 'Rendah'];
const STATUS_OPTIONS: StatusPermintaan[] = ['Menunggu', 'Diproses', 'Disetujui', 'Ditolak'];

function formatRupiah(nominal: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nominal);
}

function getStatusMeta(status: StatusPermintaan) {
  switch (status) {
    case 'Disetujui':
      return {
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'Diproses':
      return {
        className: 'bg-sky-50 text-sky-800 border-sky-200',
        icon: RefreshCw,
      };
    case 'Ditolak':
      return {
        className: 'bg-red-50 text-red-800 border-red-200',
        icon: XCircle,
      };
    default:
      return {
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Clock,
      };
  }
}

export function PermintaanView({
  requests,
  onAdd,
  onUpdate,
  onDelete,
  onNotify,
}: PermintaanViewProps) {
  const [selectedYear, setSelectedYear] = useState<TahunAnggaran>(2026);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementRequest | null>(null);
  const [namaPerangkat, setNamaPerangkat] = useState('');
  const [spesifikasiSingkat, setSpesifikasiSingkat] = useState('');
  const [jumlah, setJumlah] = useState('1');
  const [estimasiHarga, setEstimasiHarga] = useState('');
  const [urgensi, setUrgensi] = useState<UrgensiLevel>('Sedang');
  const [status, setStatus] = useState<StatusPermintaan>('Menunggu');
  const [tahunAnggaran, setTahunAnggaran] = useState<TahunAnggaran>(2026);
  const [pengusul, setPengusul] = useState('Drs. Hendra Wijaya, M.Kom.');
  const [formError, setFormError] = useState('');

  // Modal Export Excel / CSV
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportYearScope, setExportYearScope] = useState<'Semua' | TahunAnggaran>(2026);
  const [exportStatusScope, setExportStatusScope] = useState<'Semua' | StatusPermintaan>('Semua');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');

  // Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<ProcurementRequest | null>(null);

  const yearRequests = useMemo(
    () => requests.filter((r) => r.tahunAnggaran === selectedYear),
    [requests, selectedYear]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return yearRequests.filter(
      (r) =>
        !q ||
        r.namaPerangkat.toLowerCase().includes(q) ||
        r.spesifikasiSingkat.toLowerCase().includes(q) ||
        r.pengusul.toLowerCase().includes(q)
    );
  }, [yearRequests, searchQuery]);

  const yearSummary = useMemo(() => {
    const totalUnit = yearRequests.reduce((acc, r) => acc + r.jumlah, 0);
    const totalAnggaran = yearRequests.reduce(
      (acc, r) => acc + r.jumlah * r.estimasiHarga,
      0
    );
    const disetujui = yearRequests.filter((r) => r.status === 'Disetujui').length;
    return {
      jumlahPengajuan: yearRequests.length,
      totalUnit,
      totalAnggaran,
      disetujui,
    };
  }, [yearRequests]);

  const exportPreviewItems = useMemo(() => {
    return requests.filter((req) => {
      const matchYear = exportYearScope === 'Semua' || req.tahunAnggaran === exportYearScope;
      const matchStatus = exportStatusScope === 'Semua' || req.status === exportStatusScope;
      return matchYear && matchStatus;
    });
  }, [requests, exportYearScope, exportStatusScope]);

  const exportTotalBudget = useMemo(
    () => exportPreviewItems.reduce((acc, r) => acc + r.jumlah * r.estimasiHarga, 0),
    [exportPreviewItems]
  );

  const openExportModal = () => {
    setExportYearScope(selectedYear);
    setExportStatusScope('Semua');
    setExportFormat('excel');
    setExportModalOpen(true);
  };

  const handleConfirmExport = () => {
    if (exportPreviewItems.length === 0) return;

    const yearLabel = exportYearScope === 'Semua' ? '2025-2027' : String(exportYearScope);
    const statusLabel = exportStatusScope === 'Semua' ? 'Semua_Status' : exportStatusScope;

    const rows: Array<Array<string | number>> = exportPreviewItems.map((req, idx) => [
      idx + 1,
      req.namaPerangkat,
      req.spesifikasiSingkat,
      req.jumlah,
      req.estimasiHarga,
      req.jumlah * req.estimasiHarga,
      req.urgensi,
      req.status,
      req.tahunAnggaran,
      req.pengusul,
    ]);

    rows.push([
      '',
      'TOTAL ESTIMASI ANGGARAN',
      '',
      exportPreviewItems.reduce((acc, r) => acc + r.jumlah, 0),
      '',
      exportTotalBudget,
      '',
      '',
      yearLabel,
      '',
    ]);

    exportTabularData({
      title: `Daftar Permintaan Perangkat SMANSATEKUN (Tahun ${yearLabel} - ${
        exportStatusScope === 'Semua' ? 'Semua Status' : exportStatusScope
      })`,
      filenameBase: `Permintaan_Perangkat_SMANSATEKUN_${yearLabel}_${statusLabel}`,
      headers: [
        'No',
        'Nama Perangkat',
        'Spesifikasi Singkat',
        'Jumlah (Qty)',
        'Estimasi Harga Satuan (Rp)',
        'Total Estimasi (Rp)',
        'Urgensi',
        'Status',
        'Tahun Anggaran',
        'Pengusul',
      ],
      rows,
      format: exportFormat,
    });

    onNotify(
      `Berhasil mengunduh ${exportPreviewItems.length} daftar permintaan (${yearLabel}) dalam format ${
        exportFormat === 'excel' ? 'Excel' : 'CSV'
      }.`
    );
    setExportModalOpen(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNamaPerangkat('');
    setSpesifikasiSingkat('');
    setJumlah('1');
    setEstimasiHarga('');
    setUrgensi('Sedang');
    setStatus('Menunggu');
    setTahunAnggaran(selectedYear);
    setPengusul('Drs. Hendra Wijaya, M.Kom.');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: ProcurementRequest) => {
    setEditingItem(item);
    setNamaPerangkat(item.namaPerangkat);
    setSpesifikasiSingkat(item.spesifikasiSingkat);
    setJumlah(String(item.jumlah));
    setEstimasiHarga(String(item.estimasiHarga));
    setUrgensi(item.urgensi);
    setStatus(item.status);
    setTahunAnggaran(item.tahunAnggaran);
    setPengusul(item.pengusul);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(jumlah);
    const priceNum = Number(estimasiHarga);

    if (!namaPerangkat.trim()) {
      setFormError('Nama perangkat yang diminta wajib diisi.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setFormError('Jumlah unit harus lebih dari 0.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFormError('Estimasi harga satuan tidak valid.');
      return;
    }

    const payload = {
      namaPerangkat: namaPerangkat.trim(),
      spesifikasiSingkat:
        spesifikasiSingkat.trim() || 'Sesuai standar pengadaan laboratorium sekolah',
      jumlah: Math.round(qtyNum),
      estimasiHarga: Math.round(priceNum),
      urgensi,
      status,
      tahunAnggaran,
      pengusul: pengusul.trim() || 'Tim Laboratorium Komputer',
    };

    if (editingItem) {
      onUpdate({ ...editingItem, ...payload });
    } else {
      onAdd(payload);
    }

    // Otomatis pindah ke tab tahun anggaran yang dipilih jika berbeda
    setSelectedYear(tahunAnggaran);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Daftar Permintaan Pengadaan Perangkat
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Rencana kebutuhan dan usulan pengadaan perangkat laboratorium komputer berdasarkan tahun anggaran.
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
            Tambah Permintaan
          </button>
        </div>
      </div>

      {/* Tab Filter Tahun Anggaran (2025, 2026, 2027) & Pencarian */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <span>Tahun Anggaran:</span>
          </div>
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/80"
            role="tablist"
            aria-label="Filter tahun anggaran"
          >
            {TAHUN_OPTIONS.map((year) => {
              const count = requests.filter((r) => r.tahunAnggaran === year).length;
              const isActive = selectedYear === year;

              return (
                <button
                  key={year}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    isActive
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {year}
                  <span
                    className={`ml-1.5 font-mono text-xs ${
                      isActive ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari usulan tahun ${selectedYear}...`}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Ringkasan Anggaran Tahun Terpilih */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Usulan Tahun {selectedYear}</p>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {yearSummary.jumlahPengajuan} item
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Total Kuantitas</p>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {yearSummary.totalUnit} unit
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Total Estimasi Anggaran</p>
          <p className="mt-2 text-xl sm:text-2xl font-bold font-mono text-indigo-700 tabular-nums truncate">
            {formatRupiah(yearSummary.totalAnggaran)}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Sudah Disetujui</p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {yearSummary.disetujui} / {yearSummary.jumlahPengajuan}
          </p>
        </div>
      </div>

      {/* Tabel Permintaan Perangkat */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-5">Nama Perangkat yang Diminta</th>
                <th className="py-3.5 px-4 text-right">Jumlah (Qty)</th>
                <th className="py-3.5 px-4 text-right">Estimasi Harga</th>
                <th className="py-3.5 px-4">Urgensi</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Tahun Anggaran</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-5 text-center text-slate-500">
                    Belum ada daftar permintaan perangkat untuk tahun anggaran {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const subtotal = req.jumlah * req.estimasiHarga;
                  const statusMeta = getStatusMeta(req.status);
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 align-top max-w-xs">
                        <p className="font-semibold text-slate-900">{req.namaPerangkat}</p>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                          {req.spesifikasiSingkat}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Pengusul: {req.pengusul}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {req.jumlah} unit
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <p className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatRupiah(subtotal)}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                          @{formatRupiah(req.estimasiHarga)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span
                          className={`text-xs font-bold ${
                            req.urgensi === 'Tinggi'
                              ? 'text-red-600'
                              : req.urgensi === 'Sedang'
                              ? 'text-amber-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {req.urgensi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top text-center font-mono text-xs font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                        {req.tahunAnggaran}
                      </td>
                      <td className="py-3.5 px-5 align-top whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(req)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(req)}
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

      {/* Modal Tambah / Edit Permintaan */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Permintaan Perangkat' : 'Tambah Permintaan Perangkat'}
        subtitle="Lengkapi rincian perangkat yang diajukan beserta estimasi anggaran dan tahun perencanaannya."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="req-nama" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Perangkat yang Diminta
            </label>
            <input
              id="req-nama"
              type="text"
              value={namaPerangkat}
              onChange={(e) => setNamaPerangkat(e.target.value)}
              placeholder="Contoh: PC Desktop All-in-One Praktikum"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="req-spek" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Spesifikasi Singkat & Kebutuhan
            </label>
            <input
              id="req-spek"
              type="text"
              value={spesifikasiSingkat}
              onChange={(e) => setSpesifikasiSingkat(e.target.value)}
              placeholder="Contoh: Core i5, 16GB RAM, SSD 512GB untuk Lab 2"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="req-qty" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Jumlah (Qty)
              </label>
              <input
                id="req-qty"
                type="number"
                min={1}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="req-harga" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Estimasi Harga Satuan (Rp)
              </label>
              <input
                id="req-harga"
                type="number"
                min={0}
                step={50000}
                value={estimasiHarga}
                onChange={(e) => setEstimasiHarga(e.target.value)}
                placeholder="Contoh: 8500000"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="req-tahun" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tahun Anggaran
              </label>
              <select
                id="req-tahun"
                value={tahunAnggaran}
                onChange={(e) => setTahunAnggaran(Number(e.target.value) as TahunAnggaran)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {TAHUN_OPTIONS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="req-urgensi" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Urgensi
              </label>
              <select
                id="req-urgensi"
                value={urgensi}
                onChange={(e) => setUrgensi(e.target.value as UrgensiLevel)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {URGENSI_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="req-status" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="req-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPermintaan)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="req-pengusul" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Pengusul
            </label>
            <input
              id="req-pengusul"
              type="text"
              value={pengusul}
              onChange={(e) => setPengusul(e.target.value)}
              placeholder="Contoh: Drs. Hendra Wijaya, M.Kom."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700"
            >
              {editingItem ? 'Simpan Perubahan' : 'Ajukan Permintaan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Popup Export Excel / CSV */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Daftar Permintaan Perangkat"
        subtitle="Pilih cakupan tahun anggaran, status pengajuan, dan format berkas sebelum mengunduh."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="export-req-year"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Tahun Anggaran
              </label>
              <select
                id="export-req-year"
                value={String(exportYearScope)}
                onChange={(e) =>
                  setExportYearScope(
                    e.target.value === 'Semua'
                      ? 'Semua'
                      : (Number(e.target.value) as TahunAnggaran)
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Semua">Semua Tahun (2025 - 2027)</option>
                {TAHUN_OPTIONS.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun Anggaran {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="export-req-status"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Status Permintaan
              </label>
              <select
                id="export-req-status"
                value={exportStatusScope}
                onChange={(e) =>
                  setExportStatusScope(e.target.value as 'Semua' | StatusPermintaan)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Semua">Semua Status</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="block text-sm font-semibold text-slate-700 mb-1.5">Format File</p>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                  exportFormat === 'excel'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel (.xls)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                  exportFormat === 'csv'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                CSV (.csv)
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-1">
            {exportPreviewItems.length > 0 ? (
              <>
                <p>
                  Siap mengunduh{' '}
                  <strong className="font-mono text-slate-900 tabular-nums">
                    {exportPreviewItems.length} usulan perangkat
                  </strong>
                  .
                </p>
                <p>
                  Total estimasi anggaran:{' '}
                  <strong className="font-mono text-indigo-700 tabular-nums">
                    {formatRupiah(exportTotalBudget)}
                  </strong>
                </p>
              </>
            ) : (
              <p className="text-amber-700 font-medium">
                Tidak ada daftar permintaan pada kombinasi tahun dan status yang dipilih.
              </p>
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Unduh {exportFormat === 'excel' ? 'Excel' : 'CSV'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
        }}
        title="Hapus Daftar Permintaan"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus usulan "${deleteTarget.namaPerangkat}" untuk tahun anggaran ${deleteTarget.tahunAnggaran}?`
            : ''
        }
      />
    </div>
  );
}
