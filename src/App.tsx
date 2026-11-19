import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from './firebase';
import {
  ApprovedStaffItem,
  AuthUser,
  MenuKey,
  BeritaItem,
  DokumentasiItem,
  InstagramPost,
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
  INITIAL_INSTAGRAM_POSTS,
  INITIAL_JABATAN,
  INITIAL_LMS_COURSES,
  INITIAL_STUDENTS,
  INITIAL_INVENTORY,
  INITIAL_PROCUREMENT,
} from './data/initialData';
import {
  syncFirebaseUserProfile,
  seedInitialCollectionsIfEmpty,
  subscribePublicCollection,
  subscribeStudentPoints,
  subscribeApprovedStaff,
  isBootstrappedAdminEmail,
  addApprovedStaffDoc,
  removeApprovedStaffDoc,
  createDokumentasiDoc,
  updateDokumentasiDoc,
  deleteDokumentasiDoc,
  createInstagramPostDoc,
  updateInstagramPostDoc,
  deleteInstagramPostDoc,
  createBeritaDoc,
  updateBeritaDoc,
  deleteBeritaDoc,
  createJabatanDoc,
  updateJabatanDoc,
  deleteJabatanDoc,
  updateLmsModulesDoc,
  createStudentPointDoc,
  updateStudentPointsDoc,
  createInventoryDoc,
  updateInventoryDoc,
  deleteInventoryDoc,
  createProcurementDoc,
  updateProcurementDoc,
  deleteProcurementDoc,
  createFirestoreId,
} from './services/firestoreService';
import { checkClientRateLimit } from './utils/security';
import { DatabaseBackupPayload } from './utils/adminExport';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal, GUEST_USER } from './components/LoginModal';
import { UploadDokumentasiModal } from './components/UploadDokumentasiModal';
import { AdminToolsModal } from './components/AdminToolsModal';
import { GaleriDokumentasiView } from './components/views/GaleriDokumentasiView';
import { StrukturJabatanView } from './components/views/StrukturJabatanView';
import { LmsView } from './components/views/LmsView';
import { PoinMuridView } from './components/views/PoinMuridView';
import { InventarisView } from './components/views/InventarisView';
import { PermintaanView } from './components/views/PermintaanView';

function formatTodayId() {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function App() {
  // Status Autentikasi Firebase (Default Pengunjung / Publik)
  const [currentUser, setCurrentUser] = useState<AuthUser>(GUEST_USER);
  const [firebaseUserEmail, setFirebaseUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isRootAdmin, setIsRootAdmin] = useState<boolean>(false);

  const [activeMenu, setActiveMenu] = useLocalStorage<MenuKey>(
    'smansatekun_active_menu_v2',
    'galeri'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    'smansatekun_sidebar_collapsed',
    false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal Login, Upload Dokumentasi, & Panel Admin
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginContextHint, setLoginContextHint] = useState<string | undefined>(undefined);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingDokumentasi, setEditingDokumentasi] = useState<DokumentasiItem | null>(null);
  const [adminToolsOpen, setAdminToolsOpen] = useState(false);

  // State Data Real-Time dari Firebase Firestore (dengan fallback tampilan awal sebelum Admin seed pertama)
  const [dokumentasiList, setDokumentasiList] = useState<DokumentasiItem[]>(INITIAL_DOKUMENTASI);
  const [beritaList, setBeritaList] = useState<BeritaItem[]>(INITIAL_BERITA);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>(INITIAL_INSTAGRAM_POSTS);
  const [jabatanList, setJabatanList] = useState<JabatanItem[]>(INITIAL_JABATAN);
  const [lmsCourses, setLmsCourses] = useState<LmsCourse[]>(INITIAL_LMS_COURSES);
  const [students, setStudents] = useState<StudentPoint[]>(INITIAL_STUDENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [procurement, setProcurement] = useState<ProcurementRequest[]>(INITIAL_PROCUREMENT);
  const [approvedStaff, setApprovedStaff] = useState<ApprovedStaffItem[]>([]);

  const seededRef = useRef(false);

  // Notifikasi Toast Ringkas
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((pesan: string, tipe: ToastMessage['tipe'] = 'sukses') => {
    const id = createFirestoreId('toast');
    setToast({ id, pesan, tipe });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3600);
  }, []);

  // Pantau status autentikasi Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(GUEST_USER);
        setFirebaseUserEmail(null);
        setIsRootAdmin(false);
        setAdminToolsOpen(false);
        setApprovedStaff([]);
        setAuthReady(true);
        return;
      }

      setFirebaseUserEmail(fbUser.email || null);

      try {
        const { user: profile, isApprovedStaff } = await syncFirebaseUserProfile(fbUser);
        setCurrentUser(profile);
        setIsRootAdmin(Boolean(fbUser.emailVerified && isBootstrappedAdminEmail(fbUser.email)));
        setAuthReady(true);

        if (!isApprovedStaff) {
          showToast(
            'Akun Google ini belum terdaftar sebagai Guru/Admin SMANSATEKUN. Akses saat ini hanya baca.',
            'peringatan'
          );
        }

        if (profile.role === 'admin' && !seededRef.current) {
          seededRef.current = true;
          const seeded = await seedInitialCollectionsIfEmpty(profile);
          if (seeded) {
            showToast('Data awal SMANSATEKUN berhasil disinkronkan ke database Firebase.');
          }
        }
      } catch (err) {
        console.error('Gagal menyinkronkan profil pengguna:', err);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [showToast]);

  // Langganan Real-time Koleksi Publik Firebase Firestore
  useEffect(() => {
    if (!authReady) return;

    const unsubs = [
      subscribePublicCollection<DokumentasiItem>('dokumentasi', (items, hasDocs) => {
        if (hasDocs) setDokumentasiList(items);
      }),
      subscribePublicCollection<BeritaItem>('berita', (items, hasDocs) => {
        if (hasDocs) setBeritaList(items);
      }),
      subscribePublicCollection<InstagramPost>('instagramPosts', (items, hasDocs) => {
        if (hasDocs) setInstagramPosts(items);
      }),
      subscribePublicCollection<JabatanItem>('jabatan', (items, hasDocs) => {
        if (hasDocs) setJabatanList(items);
      }),
      subscribePublicCollection<LmsCourse>('lmsCourses', (items, hasDocs) => {
        if (hasDocs) setLmsCourses(items);
      }),
      subscribePublicCollection<InventoryItem>('inventaris', (items, hasDocs) => {
        if (hasDocs) setInventory(items);
      }),
      subscribePublicCollection<ProcurementRequest>('permintaan', (items, hasDocs) => {
        if (hasDocs) setProcurement(items);
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [authReady]);

  // Langganan Real-time Poin Murid (Khusus Guru/Admin Terautentikasi — Isolasi PII)
  useEffect(() => {
    if (!authReady || currentUser.role === 'guest') {
      return;
    }

    const unsub = subscribeStudentPoints(currentUser.id, isRootAdmin, (items, hasDocs) => {
      if (hasDocs) {
        setStudents(items);
      }
    });

    return () => unsub();
  }, [authReady, currentUser.id, currentUser.role, isRootAdmin]);

  // Langganan Real-time Daftar Email Guru Terverifikasi (Khusus Admin)
  useEffect(() => {
    if (!authReady || currentUser.role !== 'admin') {
      setApprovedStaff([]);
      return;
    }

    const unsub = subscribeApprovedStaff((items) => {
      setApprovedStaff(items);
    });

    return () => unsub();
  }, [authReady, currentUser.role]);

  // Helper Wajib Masuk + Pembatasan Frekuensi (Anti-Spam) untuk Operasi Tulis ke Firebase
  const requireAuth = useCallback(
    (actionLabel: string, adminOnly = false): boolean => {
      if (currentUser.role === 'guest') {
        setLoginContextHint(
          firebaseUserEmail
            ? `Akun ${firebaseUserEmail} belum terdaftar sebagai Guru/Admin SMANSATEKUN. Hubungi Admin untuk aktivasi.`
            : `Silakan masuk dengan akun Google Guru atau Admin terdaftar untuk ${actionLabel}.`
        );
        setLoginModalOpen(true);
        return false;
      }
      if (adminOnly && currentUser.role !== 'admin') {
        showToast('Aksi ini hanya dapat dilakukan oleh Admin Laboratorium.', 'peringatan');
        return false;
      }
      if (!checkClientRateLimit(`write:${currentUser.id}`, 25, 60_000)) {
        showToast(
          'Terlalu banyak permintaan penyimpanan dalam 1 menit. Tunggu sebentar lalu coba lagi.',
          'peringatan'
        );
        return false;
      }
      return true;
    },
    [currentUser.id, currentUser.role, firebaseUserEmail, showToast]
  );

  // Buka Modal Upload Dokumentasi
  const handleTriggerUpload = useCallback(
    (editItem?: DokumentasiItem) => {
      if (!requireAuth('mengunggah dokumentasi kegiatan')) return;
      setEditingDokumentasi(editItem ?? null);
      setUploadModalOpen(true);
    },
    [requireAuth]
  );

  // Handler Galeri Dokumentasi
  const handleSaveDokumentasi = useCallback(
    async (
      data: Omit<DokumentasiItem, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>,
      existingId?: string
    ) => {
      if (!requireAuth('menyimpan dokumentasi')) return;
      try {
        if (existingId) {
          await updateDokumentasiDoc(existingId, data);
          showToast(`Dokumentasi "${data.judul}" berhasil diperbarui di Firebase.`);
        } else {
          await createDokumentasiDoc(data, currentUser);
          setActiveMenu('galeri');
          showToast(`Dokumentasi "${data.judul}" berhasil dipublikasikan ke Firebase.`);
        }
        setEditingDokumentasi(null);
      } catch {
        showToast('Gagal menyimpan dokumentasi ke database Firebase.', 'peringatan');
      }
    },
    [currentUser, requireAuth, setActiveMenu, showToast]
  );

  const handleDeleteDokumentasi = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus dokumentasi')) return;
      try {
        await deleteDokumentasiDoc(id);
        showToast('Dokumentasi kegiatan telah dihapus dari Firebase.', 'info');
      } catch {
        showToast('Gagal menghapus dokumentasi. Pastikan Anda pemilik atau Admin.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler Postingan Instagram (Admin & Guru Terdaftar)
  const handleAddInstagram = useCallback(
    async (
      item: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
    ) => {
      if (!requireAuth('menambahkan postingan Instagram')) return;
      try {
        await createInstagramPostDoc(item, currentUser);
        showToast('Postingan Instagram berhasil ditayangkan di beranda.');
      } catch {
        showToast('Gagal menambahkan postingan Instagram. Periksa tautan instagram.com.', 'peringatan');
      }
    },
    [currentUser, requireAuth, showToast]
  );

  const handleUpdateInstagram = useCallback(
    async (
      id: string,
      item: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
    ) => {
      if (!requireAuth('memperbarui postingan Instagram')) return;
      try {
        await updateInstagramPostDoc(id, item);
        showToast('Postingan Instagram berhasil diperbarui.');
      } catch {
        showToast('Gagal memperbarui postingan Instagram.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleDeleteInstagram = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus postingan Instagram')) return;
      try {
        await deleteInstagramPostDoc(id);
        showToast('Postingan Instagram telah dihapus.', 'info');
      } catch {
        showToast('Gagal menghapus postingan Instagram.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler Whitelist Guru (Khusus Admin)
  const handleAddApprovedStaff = useCallback(
    async (data: { email: string; nama: string; jabatan: string }) => {
      if (!requireAuth('menambahkan email guru terdaftar', true)) return;
      await addApprovedStaffDoc(data, currentUser.id);
      showToast(`Email guru ${data.email} berhasil diizinkan mengakses sistem.`);
    },
    [currentUser.id, requireAuth, showToast]
  );

  const handleRemoveApprovedStaff = useCallback(
    async (staffKey: string) => {
      if (!requireAuth('mencabut akses email guru', true)) return;
      try {
        await removeApprovedStaffDoc(staffKey);
        showToast('Akses guru telah dicabut dari daftar whitelist.', 'info');
      } catch {
        showToast('Gagal mencabut akses guru.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler Berita Media (Admin)
  const handleAddBerita = useCallback(
    async (item: Omit<BeritaItem, 'id'>) => {
      if (!requireAuth('menambahkan berita media', true)) return;
      try {
        await createBeritaDoc(item);
        showToast(`Tautan berita "${item.sumber}" disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menambahkan berita ke Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleUpdateBerita = useCallback(
    async (updated: BeritaItem) => {
      if (!requireAuth('memperbarui berita media', true)) return;
      try {
        await updateBeritaDoc(updated);
        showToast('Tautan berita berhasil diperbarui di Firebase.');
      } catch {
        showToast('Gagal memperbarui berita di Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleDeleteBerita = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus berita media', true)) return;
      try {
        await deleteBeritaDoc(id);
        showToast('Tautan berita dihapus dari Firebase.', 'info');
      } catch {
        showToast('Gagal menghapus berita dari Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler Struktur Jabatan (Admin)
  const handleAddJabatan = useCallback(
    async (item: Omit<JabatanItem, 'id'>) => {
      if (!requireAuth('menambahkan struktur jabatan', true)) return;
      try {
        await createJabatanDoc(item);
        showToast(`Jabatan "${item.jabatan}" berhasil disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menambahkan jabatan ke Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleUpdateJabatan = useCallback(
    async (updated: JabatanItem) => {
      if (!requireAuth('memperbarui struktur jabatan', true)) return;
      try {
        await updateJabatanDoc(updated);
        showToast(`Data "${updated.nama}" berhasil diperbarui di Firebase.`);
      } catch {
        showToast('Gagal memperbarui struktur jabatan di Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleDeleteJabatan = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus struktur jabatan', true)) return;
      try {
        await deleteJabatanDoc(id);
        showToast('Data jabatan berhasil dihapus dari Firebase.', 'info');
      } catch {
        showToast('Gagal menghapus data jabatan dari Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler LMS
  const handleToggleLmsModule = useCallback(
    async (courseId: string, moduleId: string) => {
      if (!requireAuth('memperbarui progres modul LMS')) return;
      const target = lmsCourses.find((c) => c.id === courseId);
      if (!target) return;
      const nextModules = target.modul.map((mod) =>
        mod.id === moduleId ? { ...mod, selesai: !mod.selesai } : mod
      );
      try {
        await updateLmsModulesDoc(courseId, nextModules);
      } catch {
        showToast('Gagal memperbarui progres modul ke Firebase.', 'peringatan');
      }
    },
    [lmsCourses, requireAuth, showToast]
  );

  const handleAddLmsModule = useCallback(
    async (
      courseId: string,
      modul: { judul: string; durasi: string; ringkasan: string }
    ) => {
      if (!requireAuth('menambahkan modul LMS')) return;
      const target = lmsCourses.find((c) => c.id === courseId);
      if (!target) return;
      const nextModules = [
        ...target.modul,
        {
          id: createFirestoreId('mod'),
          judul: modul.judul,
          durasi: modul.durasi,
          ringkasan: modul.ringkasan,
          selesai: false,
        },
      ];
      try {
        await updateLmsModulesDoc(courseId, nextModules);
        showToast(`Modul "${modul.judul}" disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menambahkan modul LMS ke Firebase.', 'peringatan');
      }
    },
    [lmsCourses, requireAuth, showToast]
  );

  // Handler Poin Murid
  const handleAdjustPoint = useCallback(
    async (
      studentId: string,
      jenis: 'prestasi' | 'pelanggaran',
      poin: number,
      catatan: string
    ) => {
      if (!requireAuth('mencatat poin murid')) return;
      const target = students.find((s) => s.id === studentId);
      if (!target) return;
      const nextLog = {
        id: createFirestoreId('log'),
        tanggal: formatTodayId(),
        jenis,
        poin,
        catatan,
      };
      const nextPrestasi =
        jenis === 'prestasi' ? target.poinPrestasi + poin : target.poinPrestasi;
      const nextPelanggaran =
        jenis === 'pelanggaran' ? target.poinPelanggaran + poin : target.poinPelanggaran;
      const nextRiwayat = [nextLog, ...target.riwayat];

      try {
        await updateStudentPointsDoc(studentId, nextPrestasi, nextPelanggaran, nextRiwayat);
        showToast(
          jenis === 'prestasi'
            ? `Berhasil menambahkan +${poin} poin prestasi ke Firebase.`
            : `Berhasil mencatat -${poin} poin pelanggaran ke Firebase.`
        );
      } catch {
        showToast('Gagal memperbarui poin murid di Firebase.', 'peringatan');
      }
    },
    [students, requireAuth, showToast]
  );

  const handleAddStudent = useCallback(
    async (data: { nis: string; nama: string; kelas: string }) => {
      if (!requireAuth('menambahkan data murid')) return;
      try {
        await createStudentPointDoc(data, currentUser.id);
        showToast(`Murid "${data.nama}" berhasil disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menambahkan murid ke Firebase.', 'peringatan');
      }
    },
    [currentUser.id, requireAuth, showToast]
  );

  // Handler Inventaris
  const handleAddInventory = useCallback(
    async (item: Omit<InventoryItem, 'id' | 'terakhirDiperiksa'>) => {
      if (!requireAuth('menambahkan perangkat inventaris')) return;
      try {
        await createInventoryDoc(item, formatTodayId());
        showToast(`Perangkat "${item.namaPerangkat}" disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menyimpan perangkat ke Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const handleUpdateInventory = useCallback(
    async (updated: InventoryItem) => {
      if (!requireAuth('memperbarui data inventaris')) return;
      try {
        await updateInventoryDoc(updated, currentUser.role === 'admin');
        showToast(`Data perangkat "${updated.kodeBarang}" diperbarui di Firebase.`);
      } catch {
        showToast('Gagal memperbarui perangkat di Firebase.', 'peringatan');
      }
    },
    [currentUser.role, requireAuth, showToast]
  );

  const handleDeleteInventory = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus perangkat inventaris', true)) return;
      try {
        await deleteInventoryDoc(id);
        showToast('Perangkat dihapus dari Firebase.', 'info');
      } catch {
        showToast('Gagal menghapus perangkat dari Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  // Handler Permintaan Perangkat
  const handleAddProcurement = useCallback(
    async (req: Omit<ProcurementRequest, 'id'>) => {
      if (!requireAuth('mengajukan permintaan perangkat')) return;
      try {
        await createProcurementDoc(req, currentUser.id, currentUser.role === 'admin');
        showToast(`Permintaan "${req.namaPerangkat}" (${req.tahunAnggaran}) disimpan ke Firebase.`);
      } catch {
        showToast('Gagal menyimpan permintaan perangkat ke Firebase.', 'peringatan');
      }
    },
    [currentUser.id, currentUser.role, requireAuth, showToast]
  );

  const handleUpdateProcurement = useCallback(
    async (updated: ProcurementRequest) => {
      if (!requireAuth('memperbarui permintaan perangkat')) return;
      try {
        await updateProcurementDoc(updated, currentUser.role === 'admin');
        showToast(`Permintaan "${updated.namaPerangkat}" berhasil diperbarui di Firebase.`);
      } catch {
        showToast(
          'Gagal memperbarui permintaan (status yang sudah Disetujui/Ditolak hanya dapat diubah Admin).',
          'peringatan'
        );
      }
    },
    [currentUser.role, requireAuth, showToast]
  );

  const handleDeleteProcurement = useCallback(
    async (id: string) => {
      if (!requireAuth('menghapus permintaan perangkat')) return;
      try {
        await deleteProcurementDoc(id);
        showToast('Permintaan perangkat telah dihapus dari Firebase.', 'info');
      } catch {
        showToast('Gagal menghapus permintaan perangkat dari Firebase.', 'peringatan');
      }
    },
    [requireAuth, showToast]
  );

  const quickStats = useMemo(
    () => ({
      totalDokumentasi: dokumentasiList.length,
      totalPerangkat: inventory.length,
      totalMurid: students.length,
    }),
    [dokumentasiList.length, inventory.length, students.length]
  );

  const backupPayload = useMemo<DatabaseBackupPayload>(
    () => ({
      app: 'SMANSATEKUN',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.username,
      firebaseProjectId: FIREBASE_PROJECT_ID,
      firestoreDatabaseId: FIRESTORE_DATABASE_ID,
      counts: {
        dokumentasi: dokumentasiList.length,
        berita: beritaList.length,
        instagramPosts: instagramPosts.length,
        jabatan: jabatanList.length,
        lmsCourses: lmsCourses.length,
        poinMurid: students.length,
        inventaris: inventory.length,
        permintaan: procurement.length,
      },
      collections: {
        dokumentasi: dokumentasiList,
        berita: beritaList,
        instagramPosts,
        jabatan: jabatanList,
        lmsCourses,
        poinMurid: students,
        inventaris: inventory,
        permintaan: procurement,
      },
    }),
    [
      currentUser.username,
      dokumentasiList,
      beritaList,
      instagramPosts,
      jabatanList,
      lmsCourses,
      students,
      inventory,
      procurement,
    ]
  );

  const isLoggedIn = currentUser.role !== 'guest';
  const isAdmin = currentUser.role === 'admin';

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
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          onOpenAdminTools={() => setAdminToolsOpen(true)}
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
                    instagramPosts={instagramPosts}
                    currentUser={currentUser}
                    onOpenUpload={handleTriggerUpload}
                    onDeleteDokumentasi={handleDeleteDokumentasi}
                    onAddBerita={handleAddBerita}
                    onUpdateBerita={handleUpdateBerita}
                    onDeleteBerita={handleDeleteBerita}
                    onAddInstagram={handleAddInstagram}
                    onUpdateInstagram={handleUpdateInstagram}
                    onDeleteInstagram={handleDeleteInstagram}
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

      {/* Modal Login Glassmorphism Firebase Google Auth */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);
          setLoginContextHint(undefined);
        }}
        currentUser={currentUser}
        firebaseEmail={firebaseUserEmail}
        authReady={authReady}
        contextHint={loginContextHint}
        onSignedIn={() => showToast('Berhasil terhubung dengan akun Google.')}
        onSignedOut={() => showToast('Anda telah keluar ke mode Pengunjung.', 'info')}
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

      {/* Modal Alat Admin: Backup Database, Download ZIP Kode & Keamanan Guru */}
      <AdminToolsModal
        isOpen={adminToolsOpen && isAdmin}
        onClose={() => setAdminToolsOpen(false)}
        currentUser={currentUser}
        backupPayload={backupPayload}
        approvedStaff={approvedStaff}
        onAddApprovedStaff={handleAddApprovedStaff}
        onRemoveApprovedStaff={handleRemoveApprovedStaff}
        onNotify={showToast}
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
            ) : toast.tipe === 'peringatan' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
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
