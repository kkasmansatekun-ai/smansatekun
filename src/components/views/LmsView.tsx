import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  ClipboardCheck,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  MapPin,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { KelasLevel, LmsCourse } from '../../types/smansatekun';
import { Modal } from '../ui/Modal';

interface LmsViewProps {
  courses: LmsCourse[];
  onToggleModule: (courseId: string, moduleId: string) => void;
  onAddModule: (
    courseId: string,
    modul: { judul: string; durasi: string; ringkasan: string }
  ) => void;
}

const KELAS_FILTERS: Array<'Semua Kelas' | KelasLevel> = [
  'Semua Kelas',
  'Kelas X',
  'Kelas XI',
  'Kelas XII',
];

export function LmsView({ courses, onToggleModule, onAddModule }: LmsViewProps) {
  const [selectedKelas, setSelectedKelas] = useState<'Semua Kelas' | KelasLevel>('Semua Kelas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalCourseId, setActiveModalCourseId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'materi' | 'tugas'>('materi');

  const [showAddModulForm, setShowAddModulForm] = useState(false);
  const [newModulJudul, setNewModulJudul] = useState('');
  const [newModulDurasi, setNewModulDurasi] = useState('60 menit');
  const [newModulRingkasan, setNewModulRingkasan] = useState('');

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchKelas = selectedKelas === 'Semua Kelas' || course.kelas === selectedKelas;
      const matchSearch =
        !q ||
        course.nama.toLowerCase().includes(q) ||
        course.kode.toLowerCase().includes(q) ||
        course.guruPengampu.toLowerCase().includes(q);
      return matchKelas && matchSearch;
    });
  }, [courses, selectedKelas, searchQuery]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === activeModalCourseId) ?? null,
    [courses, activeModalCourseId]
  );

  const openCourseModal = (courseId: string, tab: 'materi' | 'tugas') => {
    setActiveModalCourseId(courseId);
    setModalTab(tab);
    setShowAddModulForm(false);
  };

  const handleSaveNewModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !newModulJudul.trim()) return;
    onAddModule(activeCourse.id, {
      judul: newModulJudul.trim(),
      durasi: newModulDurasi.trim() || '45 menit',
      ringkasan:
        newModulRingkasan.trim() || 'Materi praktikum terbaru untuk pembelajaran di laboratorium.',
    });
    setNewModulJudul('');
    setNewModulDurasi('60 menit');
    setNewModulRingkasan('');
    setShowAddModulForm(false);
  };

  const getCourseProgress = (course: LmsCourse) => {
    if (course.modul.length === 0) return 0;
    const completed = course.modul.filter((m) => m.selesai).length;
    return Math.round((completed / course.modul.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header & Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Portal Pembelajaran Laboratorium (LMS)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola materi praktikum, pantau ketercapaian modul, dan periksa penugasan setiap jenjang kelas.
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mata pelajaran atau guru..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Filter Jenjang Kelas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/70"
          role="tablist"
          aria-label="Filter berdasarkan kelas"
        >
          {KELAS_FILTERS.map((kelas) => {
            const count =
              kelas === 'Semua Kelas'
                ? courses.length
                : courses.filter((c) => c.kelas === kelas).length;
            const isActive = selectedKelas === kelas;

            return (
              <button
                key={kelas}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedKelas(kelas)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {kelas}{' '}
                <span className="ml-1 font-mono text-slate-400 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar Kartu Mata Pelajaran */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Mata Pelajaran Tidak Ditemukan</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ubah kata kunci pencarian atau pilih jenjang kelas lainnya.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const progress = getCourseProgress(course);
            const completedCount = course.modul.filter((m) => m.selesai).length;
            const activeTasks = course.tugas.filter((t) => t.status === 'Aktif').length;

            return (
              <motion.article
                key={course.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 transition-colors"
              >
                {/* Kicker Metadata Unboxed */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-indigo-700">{course.kode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-700">{course.kelas}</span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-500">
                    {course.modul.length} modul
                  </span>
                </div>

                {/* Judul & Deskripsi */}
                <h3 className="mt-2.5 text-base font-bold text-slate-900 leading-snug">
                  {course.nama}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {course.deskripsi}
                </p>

                {/* Info Pengampu & Jadwal */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{course.guruPengampu}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {course.ruangLab} · {course.jadwal}
                    </span>
                  </div>
                </div>

                {/* Progres Pembelajaran */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-600">
                      Progres Modul ({completedCount}/{course.modul.length})
                    </span>
                    <span className="font-mono font-bold text-indigo-700 tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${
                        progress === 100
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-indigo-600 to-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Tombol Aksi Cepat */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openCourseModal(course.id, 'materi')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0284C7] px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Lihat Materi
                  </button>
                  <button
                    type="button"
                    onClick={() => openCourseModal(course.id, 'tugas')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Tugas ({activeTasks})
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Modal Pratinjau Modul & Tugas */}
      <Modal
        isOpen={Boolean(activeCourse)}
        onClose={() => setActiveModalCourseId(null)}
        title={activeCourse ? activeCourse.nama : ''}
        subtitle={
          activeCourse
            ? `${activeCourse.kode} · ${activeCourse.kelas} · Pengampu: ${activeCourse.guruPengampu}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {activeCourse && (
          <div className="space-y-5">
            {/* Tab Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setModalTab('materi')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    modalTab === 'materi'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daftar Materi ({activeCourse.modul.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('tugas')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    modalTab === 'tugas'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Penugasan ({activeCourse.tugas.length})
                </button>
              </div>

              {modalTab === 'materi' && (
                <button
                  type="button"
                  onClick={() => setShowAddModulForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Modul
                </button>
              )}
            </div>

            {modalTab === 'materi' ? (
              <div className="space-y-3">
                {showAddModulForm && (
                  <form
                    onSubmit={handleSaveNewModule}
                    className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3"
                  >
                    <p className="text-xs font-bold text-indigo-900">Tambah Modul Materi Baru</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={newModulJudul}
                        onChange={(e) => setNewModulJudul(e.target.value)}
                        placeholder="Judul modul materi"
                        className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newModulDurasi}
                        onChange={(e) => setNewModulDurasi(e.target.value)}
                        placeholder="Durasi (mis. 60 menit)"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={newModulRingkasan}
                      onChange={(e) => setNewModulRingkasan(e.target.value)}
                      placeholder="Ringkasan singkat capaian materi..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModulForm(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      >
                        Simpan Modul
                      </button>
                    </div>
                  </form>
                )}

                <p className="text-xs text-slate-500">
                  Klik modul di bawah untuk menandai status selesai dan memperbarui progres kelas secara otomatis.
                </p>

                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
                  {activeCourse.modul.map((mod, idx) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onToggleModule(activeCourse.id, mod.id)}
                      className="w-full text-left flex items-start gap-3.5 p-4 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        {mod.selesai ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-semibold ${
                              mod.selesai ? 'text-slate-900' : 'text-slate-800'
                            }`}
                          >
                            {idx + 1}. {mod.judul}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 whitespace-nowrap shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {mod.durasi}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                          {mod.ringkasan}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
                {activeCourse.tugas.map((task) => {
                  const pct = Math.round((task.terkumpul / task.totalMurid) * 100);
                  return (
                    <div key={task.id} className="p-4 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{task.judul}</h4>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Tenggat: {task.tenggat}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                task.status === 'Selesai'
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-semibold text-indigo-700'
                              }
                            >
                              {task.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                            {task.terkumpul}/{task.totalMurid} siswa
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {pct}% terkumpul
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
