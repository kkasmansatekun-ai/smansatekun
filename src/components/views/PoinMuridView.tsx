import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  History,
  UserPlus,
  Award,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { StudentPoint } from '../../types/smansatekun';
import { Modal } from '../ui/Modal';

interface PoinMuridViewProps {
  students: StudentPoint[];
  onAdjustPoint: (
    studentId: string,
    jenis: 'prestasi' | 'pelanggaran',
    poin: number,
    catatan: string
  ) => void;
  onAddStudent: (data: { nis: string; nama: string; kelas: string }) => void;
}

function getStudentStatus(totalPoin: number): {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  if (totalPoin >= 70) {
    return {
      label: 'Teladan',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Award,
    };
  }
  if (totalPoin >= 20) {
    return {
      label: 'Baik',
      className: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: ShieldCheck,
    };
  }
  if (totalPoin >= 0) {
    return {
      label: 'Perlu Pembinaan',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: TrendingUp,
    };
  }
  return {
    label: 'Peringatan',
    className: 'bg-red-50 text-red-800 border-red-200',
    icon: AlertTriangle,
  };
}

export function PoinMuridView({
  students,
  onAdjustPoint,
  onAddStudent,
}: PoinMuridViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [kelasFilter, setKelasFilter] = useState('Semua');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  // Form tambah poin kustom
  const [pointJenis, setPointJenis] = useState<'prestasi' | 'pelanggaran'>('prestasi');
  const [pointAmount, setPointAmount] = useState('10');
  const [pointNote, setPointNote] = useState('');

  // Form tambah murid baru
  const [newNis, setNewNis] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('X-1');
  const [studentFormError, setStudentFormError] = useState('');

  const uniqueKelas = useMemo(() => {
    const set = new Set(students.map((s) => s.kelas));
    return ['Semua', ...Array.from(set).sort()];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const matchSearch =
        !q ||
        student.nama.toLowerCase().includes(q) ||
        student.nis.toLowerCase().includes(q) ||
        student.kelas.toLowerCase().includes(q);
      const matchKelas = kelasFilter === 'Semua' || student.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [students, searchQuery, kelasFilter]);

  const stats = useMemo(() => {
    const totals = students.map((s) => s.poinPrestasi - s.poinPelanggaran);
    const avg =
      totals.length > 0
        ? Math.round(totals.reduce((acc, v) => acc + v, 0) / totals.length)
        : 0;
    const teladan = totals.filter((v) => v >= 70).length;
    const peringatan = totals.filter((v) => v < 0).length;
    return { total: students.length, avg, teladan, peringatan };
  }, [students]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const handleCustomPointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const nominal = Number(pointAmount);
    if (!Number.isFinite(nominal) || nominal <= 0) return;

    onAdjustPoint(
      selectedStudent.id,
      pointJenis,
      Math.round(nominal),
      pointNote.trim() ||
        (pointJenis === 'prestasi'
          ? 'Apresiasi keaktifan dan kedisiplinan di laboratorium'
          : 'Catatan pelanggaran tata tertib laboratorium')
    );
    setPointAmount('10');
    setPointNote('');
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNis.trim() || !newNama.trim() || !newKelas.trim()) {
      setStudentFormError('Harap lengkapi NIS, Nama Murid, dan Kelas.');
      return;
    }
    onAddStudent({
      nis: newNis.trim(),
      nama: newNama.trim(),
      kelas: newKelas.trim(),
    });
    setNewNis('');
    setNewNama('');
    setNewKelas('X-1');
    setStudentFormError('');
    setAddStudentOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pencatatan Poin Prestasi & Kedisiplinan Murid
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pantau akumulasi poin prestasi dan pelanggaran tata tertib siswa selama berkegiatan di laboratorium komputer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddStudentOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-xs whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Murid
        </button>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Total Murid Terdata</p>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Rata-Rata Total Poin</p>
          <p className="mt-2 text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {stats.avg > 0 ? `+${stats.avg}` : stats.avg}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Kategori Teladan</p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {stats.teladan}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Status Peringatan</p>
          <p className="mt-2 text-2xl font-bold font-mono text-red-600 tabular-nums">
            {stats.peringatan}
          </p>
        </div>
      </div>

      {/* Bar Pencarian & Filter Kelas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama murid atau NIS..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-kelas-poin" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Filter Kelas:
          </label>
          <select
            id="filter-kelas-poin"
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {uniqueKelas.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Poin Murid */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-5">Nama Murid</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4 text-right">Poin Prestasi (+)</th>
                <th className="py-3.5 px-4 text-right">Poin Pelanggaran (-)</th>
                <th className="py-3.5 px-4 text-right">Total Poin</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi Cepat (+/- Poin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-5 text-center text-slate-500">
                    Tidak ada data murid yang sesuai dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const totalPoin = student.poinPrestasi - student.poinPelanggaran;
                  const status = getStudentStatus(totalPoin);
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900">{student.nama}</p>
                        <p className="text-xs font-mono text-slate-500 tabular-nums">
                          NIS {student.nis}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {student.kelas}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        +{student.poinPrestasi}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-red-600 tabular-nums">
                        -{student.poinPelanggaran}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                          totalPoin >= 0 ? 'text-slate-900' : 'text-red-700'
                        }`}
                      >
                        {totalPoin > 0 ? `+${totalPoin}` : totalPoin}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustPoint(
                                student.id,
                                'prestasi',
                                5,
                                'Penambahan cepat +5 poin prestasi praktikum'
                              )
                            }
                            title="Tambah 5 poin prestasi"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />5
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustPoint(
                                student.id,
                                'pelanggaran',
                                5,
                                'Pengurangan cepat -5 poin ketertiban laboratorium'
                              )
                            }
                            title="Tambah 5 poin pelanggaran"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setPointJenis('prestasi');
                              setPointAmount('10');
                              setPointNote('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                          >
                            <History className="w-3.5 h-3.5" />
                            Catat
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

      {/* Modal Catat Poin Kustom & Riwayat */}
      <Modal
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudentId(null)}
        title={selectedStudent ? `Catatan Poin · ${selectedStudent.nama}` : ''}
        subtitle={
          selectedStudent
            ? `NIS ${selectedStudent.nis} · Kelas ${selectedStudent.kelas} · Total Poin: ${
                selectedStudent.poinPrestasi - selectedStudent.poinPelanggaran
              }`
            : undefined
        }
        maxWidthClass="max-w-xl"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <form onSubmit={handleCustomPointSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setPointJenis('prestasi')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    pointJenis === 'prestasi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Poin Prestasi (+)
                </button>
                <button
                  type="button"
                  onClick={() => setPointJenis('pelanggaran')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    pointJenis === 'pelanggaran'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Poin Pelanggaran (-)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="nominal-poin"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Jumlah Poin
                  </label>
                  <input
                    id="nominal-poin"
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="catatan-poin"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Keterangan / Alasan
                  </label>
                  <input
                    id="catatan-poin"
                    type="text"
                    value={pointNote}
                    onChange={(e) => setPointNote(e.target.value)}
                    placeholder="Contoh: Membantu perawatan perangkat Lab 1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors ${
                    pointJenis === 'prestasi'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Simpan Catatan Poin
                </button>
              </div>
            </form>

            {/* Riwayat Poin */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-3">
                Riwayat Pencatatan ({selectedStudent.riwayat.length})
              </h4>
              {selectedStudent.riwayat.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada riwayat catatan poin.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedStudent.riwayat.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800">{log.catatan}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{log.tanggal}</p>
                      </div>
                      <span
                        className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                          log.jenis === 'prestasi' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {log.jenis === 'prestasi' ? `+${log.poin}` : `-${log.poin}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tambah Murid */}
      <Modal
        isOpen={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        title="Tambah Data Murid"
        subtitle="Daftarkan siswa baru ke buku pemantauan poin laboratorium."
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="std-nis" className="block text-sm font-semibold text-slate-700 mb-1.5">
                NIS (Nomor Induk Siswa)
              </label>
              <input
                id="std-nis"
                type="text"
                value={newNis}
                onChange={(e) => setNewNis(e.target.value)}
                placeholder="Contoh: 25260188"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="std-kelas" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kelas
              </label>
              <input
                id="std-kelas"
                type="text"
                value={newKelas}
                onChange={(e) => setNewKelas(e.target.value)}
                placeholder="Contoh: XI IPA 1"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="std-nama" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Lengkap Murid
            </label>
            <input
              id="std-nama"
              type="text"
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              placeholder="Contoh: Zahra Aulia Putri"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {studentFormError && (
            <p className="text-xs font-medium text-red-600">{studentFormError}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddStudentOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
            >
              Simpan Murid
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
