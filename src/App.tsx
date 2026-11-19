import React, { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info } from 'lucide-react';
import {
  AuthUser,
  MenuKey,
  BeritaItem,
  DokumentasiItem,
  JabatanItem,
  LmsCourse,
  StudentPoint,
  InventoryItem,
  ProcurementRequest,
  ToastMessage,
} from './types/smansatekun';
import {
  INITIAL_BERITA,
  INITIAL_DOKUMENTASI,
  INITIAL_JABATAN,
  INITIAL_LMS_COURSES,
  INITIAL_STUDENTS,
  INITIAL_INVENTORY,
  INITIAL_PROCUREMENT,
} from './data/initialData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal, DEMO_USERS } from './components/LoginModal';
import { UploadDokumentasiModal } from './components/UploadDokumentasiModal';
import { GaleriDokumentasiView } from './components/views/GaleriDokumentasiView';
import { StrukturJabatanView } from './components/views/StrukturJabatanView';
import { LmsView } from './components/views/LmsView';
import { PoinMuridView } from './components/views/PoinMuridView';
import { InventarisView } from './components/views/InventarisView';
import { PermintaanView } from './components/views/PermintaanView';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTodayId() {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function App() {
  // Default akses publik langsung terbuka sebagai Pengunjung di halaman Galeri Dokumentasi
  const [currentUser, setCurrentUser] = useLocalStorage<AuthUser>(
    'smansatekun_session_v2',
    DEMO_USERS.guest
  );
  const [activeMenu, setActiveMenu] = useLocalStorage<MenuKey>(
    'smansatekun_active_menu_v2',
    'galeri'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    'smansatekun_sidebar_collapsed',
    false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal Login Tersembunyi & Modal Upload Dokumentasi
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginContextHint, setLoginContextHint] = useState<string | undefined>(undefined);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingDokumentasi, setEditingDokumentasi] = useState<DokumentasiItem | null>(null);

  // State Persisten LocalStorage untuk Seluruh Modul
  const [dokumentasiList, setDokumentasiList] = useLocalStorage<DokumentasiItem[]>(
    'smansatekun_dokumentasi_v1',
    INITIAL_DOKUMENTASI
  );
  const [beritaList, setBeritaList] = useLocalStorage<BeritaItem[]>(
    'smansatekun_berita_v1',
    INITIAL_BERITA
  );
  const [jabatanList, setJabatanList] = useLocalStorage<JabatanItem[]>(
    'smansatekun_jabatan_v1',
    INITIAL_JABATAN
  );
  const [lmsCourses, setLmsCourses] = useLocalStorage<LmsCourse[]>(
    'smansatekun_lms_v2',
    INITIAL_LMS_COURSES
  );
  const [students, setStudents] = useLocalStorage<StudentPoint[]>(
    'smansatekun_poin_murid_v1',
    INITIAL_STUDENTS
  );
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>(
    'smansatekun_inventaris_v2',
    INITIAL_INVENTORY
  );
  const [procurement, setProcurement] = useLocalStorage<ProcurementRequest[]>(
    'smansatekun_permintaan_v1',
    INITIAL_PROCUREMENT
  );

  // Notifikasi Toast Ringkas
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((pesan: string, tipe: ToastMessage['tipe'] = 'sukses') => {
    const id = createId('toast');
    setToast({ id, pesan, tipe });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  // Ganti Peran / Login
  const handleSelectUser = useCallback(
    (nextUser: AuthUser) => {
      setCurrentUser(nextUser);
      setLoginContextHint(undefined);
      if (nextUser.role === 'guest') {
        showToast('Kembali ke mode Pengunjung (Akses Publik).', 'info');
      } else {
        showToast(
          `Masuk sebagai ${nextUser.role === 'admin' ? 'Admin' : 'Guru'}: ${nextUser.namaLengkap}.`
        );
      }
    },
    [setCurrentUser, showToast]
  );

  // Buka Modal Upload Dokumentasi (cek peran Admin/Guru, jika Pengunjung munculkan Login Modal)
  const handleTriggerUpload = useCallback(
    (editItem?: DokumentasiItem) => {
      if (currentUser.role === 'guest') {
        setLoginContextHint(
          'Silakan masuk sebagai Guru atau Admin terlebih dahulu untuk mengunggah dokumentasi kegiatan.'
        );
        setLoginModalOpen(true);
        return;
      }
      setEditingDokumentasi(editItem ?? null);
      setUploadModalOpen(true);
    },
    [currentUser.role]
  );

  // Handler Galeri Dokumentasi
  const handleSaveDokumentasi = useCallback(
    (
      data: Omit<DokumentasiItem, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>,
      existingId?: string
    ) => {
      if (existingId) {
        setDokumentasiList((prev) =>
          prev.map((item) => (item.id === existingId ? { ...item, ...data } : item))
        );
        showToast(`Dokumentasi "${data.judul}" berhasil diperbarui.`);
      } else {
        const uploaderRole: 'admin' | 'guru' =
          currentUser.role === 'guru' ? 'guru' : 'admin';
        setDokumentasiList((prev) => [
          {
            ...data,
            id: createId('dok'),
            uploaderId: currentUser.id,
            uploaderName: currentUser.namaLengkap,
            uploaderRole,
          },
          ...prev,
        ]);
        setActiveMenu('galeri');
        showToast(`Dokumentasi "${data.judul}" berhasil dipublikasikan.`);
      }
      setEditingDokumentasi(null);
    },
    [currentUser, setDokumentasiList, setActiveMenu, showToast]
  );

  const handleDeleteDokumentasi = useCallback(
    (id: string) => {
      setDokumentasiList((prev) => prev.filter((item) => item.id !== id));
      showToast('Dokumentasi kegiatan telah dihapus.', 'info');
    },
    [setDokumentasiList, showToast]
  );

  // Handler Berita Media (Admin)
  const handleAddBerita = useCallback(
    (item: Omit<BeritaItem, 'id'>) => {
      setBeritaList((prev) => [{ ...item, id: createId('news') }, ...prev]);
      showToast(`Tautan berita "${item.sumber}" ditambahkan.`);
    },
    [setBeritaList, showToast]
  );

  const handleUpdateBerita = useCallback(
    (updated: BeritaItem) => {
      setBeritaList((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast('Tautan berita berhasil diperbarui.');
    },
    [setBeritaList, showToast]
  );

  const handleDeleteBerita = useCallback(
    (id: string) => {
      setBeritaList((prev) => prev.filter((b) => b.id !== id));
      showToast('Tautan berita dihapus.', 'info');
    },
    [setBeritaList, showToast]
  );

  // Handler Struktur Jabatan
  const handleAddJabatan = useCallback(
    (item: Omit<JabatanItem, 'id'>) => {
      setJabatanList((prev) => [...prev, { ...item, id: createId('jab') }]);
      showToast(`Jabatan "${item.jabatan}" berhasil ditambahkan.`);
    },
    [setJabatanList, showToast]
  );

  const handleUpdateJabatan = useCallback(
    (updated: JabatanItem) => {
      setJabatanList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Data "${updated.nama}" berhasil diperbarui.`);
    },
    [setJabatanList, showToast]
  );

  const handleDeleteJabatan = useCallback(
    (id: string) => {
      setJabatanList((prev) => prev.filter((item) => item.id !== id));
      showToast('Data jabatan berhasil dihapus.', 'info');
    },
    [setJabatanList, showToast]
  );

  // Handler LMS
  const handleToggleLmsModule = useCallback(
    (courseId: string, moduleId: string) => {
      setLmsCourses((prev) =>
        prev.map((course) => {
          if (course.id !== courseId) return course;
          return {
            ...course,
            modul: course.modul.map((mod) =>
              mod.id === moduleId ? { ...mod, selesai: !mod.selesai } : mod
            ),
          };
        })
      );
    },
    [setLmsCourses]
  );

  const handleAddLmsModule = useCallback(
    (
      courseId: string,
      modul: { judul: string; durasi: string; ringkasan: string }
    ) => {
      setLmsCourses((prev) =>
        prev.map((course) => {
          if (course.id !== courseId) return course;
          return {
            ...course,
            modul: [
              ...course.modul,
              {
                id: createId('mod'),
                judul: modul.judul,
                durasi: modul.durasi,
                ringkasan: modul.ringkasan,
                selesai: false,
              },
            ],
          };
        })
      );
      showToast(`Modul "${modul.judul}" ditambahkan ke LMS.`);
    },
    [setLmsCourses, showToast]
  );

  // Handler Poin Murid
  const handleAdjustPoint = useCallback(
    (
      studentId: string,
      jenis: 'prestasi' | 'pelanggaran',
      poin: number,
      catatan: string
    ) => {
      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== studentId) return student;
          const nextLog = {
            id: createId('log'),
            tanggal: formatTodayId(),
            jenis,
            poin,
            catatan,
          };
          return {
            ...student,
            poinPrestasi:
              jenis === 'prestasi' ? student.poinPrestasi + poin : student.poinPrestasi,
            poinPelanggaran:
              jenis === 'pelanggaran'
                ? student.poinPelanggaran + poin
                : student.poinPelanggaran,
            riwayat: [nextLog, ...student.riwayat],
          };
        })
      );
      showToast(
        jenis === 'prestasi'
          ? `Berhasil menambahkan +${poin} poin prestasi.`
          : `Berhasil mencatat -${poin} poin pelanggaran.`
      );
    },
    [setStudents, showToast]
  );

  const handleAddStudent = useCallback(
    (data: { nis: string; nama: string; kelas: string }) => {
      setStudents((prev) => [
        {
          id: createId('std'),
          nis: data.nis,
          nama: data.nama,
          kelas: data.kelas,
          poinPrestasi: 0,
          poinPelanggaran: 0,
          riwayat: [],
        },
        ...prev,
      ]);
      showToast(`Murid "${data.nama}" berhasil ditambahkan.`);
    },
    [setStudents, showToast]
  );

  // Handler Inventaris
  const handleAddInventory = useCallback(
    (item: Omit<InventoryItem, 'id' | 'terakhirDiperiksa'>) => {
      setInventory((prev) => [
        {
          ...item,
          id: createId('inv'),
          terakhirDiperiksa: formatTodayId(),
        },
        ...prev,
      ]);
      showToast(`Perangkat "${item.namaPerangkat}" ditambahkan ke inventaris.`);
    },
    [setInventory, showToast]
  );

  const handleUpdateInventory = useCallback(
    (updated: InventoryItem) => {
      setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Data perangkat "${updated.kodeBarang}" diperbarui.`);
    },
    [setInventory, showToast]
  );

  const handleDeleteInventory = useCallback(
    (id: string) => {
      setInventory((prev) => prev.filter((item) => item.id !== id));
      showToast('Perangkat dihapus dari inventaris.', 'info');
    },
    [setInventory, showToast]
  );

  // Handler Permintaan Perangkat
  const handleAddProcurement = useCallback(
    (req: Omit<ProcurementRequest, 'id'>) => {
      setProcurement((prev) => [{ ...req, id: createId('req') }, ...prev]);
      showToast(`Permintaan "${req.namaPerangkat}" (${req.tahunAnggaran}) ditambahkan.`);
    },
    [setProcurement, showToast]
  );

  const handleUpdateProcurement = useCallback(
    (updated: ProcurementRequest) => {
      setProcurement((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Permintaan "${updated.namaPerangkat}" berhasil diperbarui.`);
    },
    [setProcurement, showToast]
  );

  const handleDeleteProcurement = useCallback(
    (id: string) => {
      setProcurement((prev) => prev.filter((item) => item.id !== id));
      showToast('Permintaan perangkat telah dihapus.', 'info');
    },
    [setProcurement, showToast]
  );

  const quickStats = useMemo(
    () => ({
      totalDokumentasi: dokumentasiList.length,
      totalPerangkat: inventory.length,
      totalMurid: students.length,
    }),
    [dokumentasiList.length, inventory.length, students.length]
  );

  return (
    <>
      <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
        <Sidebar
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenUpload={() => handleTriggerUpload()}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            activeMenu={activeMenu}
            user={currentUser}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenLoginModal={() => {
              setLoginContextHint(undefined);
              setLoginModalOpen(true);
            }}
            quickStats={quickStats}
          />

          <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeMenu === 'galeri' && (
                  <GaleriDokumentasiView
                    dokumentasi={dokumentasiList}
                    berita={beritaList}
                    currentUser={currentUser}
                    onOpenUpload={handleTriggerUpload}
                    onDeleteDokumentasi={handleDeleteDokumentasi}
                    onAddBerita={handleAddBerita}
                    onUpdateBerita={handleUpdateBerita}
                    onDeleteBerita={handleDeleteBerita}
                  />
                )}

                {activeMenu === 'struktur' && (
                  <StrukturJabatanView
                    items={jabatanList}
                    isAdmin={currentUser.role === 'admin'}
                    onAdd={handleAddJabatan}
                    onUpdate={handleUpdateJabatan}
                    onDelete={handleDeleteJabatan}
                  />
                )}

                {activeMenu === 'lms' && (
                  <LmsView
                    courses={lmsCourses}
                    onToggleModule={handleToggleLmsModule}
                    onAddModule={handleAddLmsModule}
                  />
                )}

                {activeMenu === 'poin' && (
                  <PoinMuridView
                    students={students}
                    onAdjustPoint={handleAdjustPoint}
                    onAddStudent={handleAddStudent}
                  />
                )}

                {activeMenu === 'inventaris' && (
                  <InventarisView
                    items={inventory}
                    onAdd={handleAddInventory}
                    onUpdate={handleUpdateInventory}
                    onDelete={handleDeleteInventory}
                    onNotify={showToast}
                  />
                )}

                {activeMenu === 'permintaan' && (
                  <PermintaanView
                    requests={procurement}
                    onAdd={handleAddProcurement}
                    onUpdate={handleUpdateProcurement}
                    onDelete={handleDeleteProcurement}
                    onNotify={showToast}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="border-t border-slate-200/80 bg-white/70 px-4 sm:px-6 lg:px-8 py-4 text-center text-xs font-medium tracking-wide text-slate-500">
            KKA SMANSATEKUN
          </footer>
        </div>
      </div>

      {/* Modal Login Glassmorphism Tersembunyi */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);
          setLoginContextHint(undefined);
        }}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        contextHint={loginContextHint}
      />

      {/* Modal Upload / Edit Dokumentasi */}
      <UploadDokumentasiModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setEditingDokumentasi(null);
        }}
        currentUser={currentUser}
        editingItem={editingDokumentasi}
        onSave={handleSaveDokumentasi}
      />

      {/* Notifikasi Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl bg-[#0F172A] text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-xl border border-white/10 max-w-sm"
          >
            {toast.tipe === 'sukses' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span>{toast.pesan}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
