import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  db,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import {
  ApprovedStaffItem,
  AuthUser,
  BeritaItem,
  DokumentasiItem,
  InstagramPost,
  InventoryItem,
  JabatanItem,
  LmsCourse,
  ProcurementRequest,
  StudentPoint,
} from '../types/smansatekun';
import {
  INITIAL_BERITA,
  INITIAL_DOKUMENTASI,
  INITIAL_INSTAGRAM_POSTS,
  INITIAL_INVENTORY,
  INITIAL_JABATAN,
  INITIAL_LMS_COURSES,
  INITIAL_PROCUREMENT,
  INITIAL_STUDENTS,
} from '../data/initialData';
import {
  emailToSafeDocId,
  isValidEmailFormat,
  sanitizeExternalUrl,
  sanitizeImageUrl,
  sanitizeInstagramUrl,
  sanitizeText,
} from '../utils/security';

function clampStr(value: string, maxLen: number, fallback = '-'): string {
  return sanitizeText(value, maxLen, fallback);
}

function clampOptionalImage(value: string | undefined): string | undefined {
  const safe = sanitizeImageUrl(value);
  return safe ?? undefined;
}

export function createFirestoreId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL);
}

/**
 * Resolve & sync authenticated Firebase user profile in `/users/{uid}`.
 * Anti-Hacker Whitelist: Only Admin or Admin-approved school emails receive 'guru' write role.
 * Unlisted external Google accounts remain read-only ('guest') so outsiders cannot alter school data.
 */
export async function syncFirebaseUserProfile(
  fbUser: FirebaseUser
): Promise<{ user: AuthUser; isApprovedStaff: boolean }> {
  const uid = fbUser.uid;
  const email = (fbUser.email || '').trim();
  const isRootAdmin = Boolean(fbUser.emailVerified && isBootstrappedAdminEmail(email));

  let isDbAdmin = false;
  let isWhitelistedGuru = false;

  if (!isRootAdmin && fbUser.emailVerified) {
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      isDbAdmin = adminSnap.exists();
    } catch {
      isDbAdmin = false;
    }

    if (!isDbAdmin && email) {
      try {
        const staffKey = emailToSafeDocId(email);
        const staffSnap = await getDoc(doc(db, 'approvedStaff', staffKey));
        isWhitelistedGuru = staffSnap.exists();
      } catch {
        isWhitelistedGuru = false;
      }
    }
  }

  const resolvedRole: AuthUser['role'] =
    isRootAdmin || isDbAdmin ? 'admin' : isWhitelistedGuru ? 'guru' : 'guest';

  const defaultName = clampStr(fbUser.displayName || email.split('@')[0] || 'Pengguna', 120);
  const defaultJabatan =
    resolvedRole === 'admin'
      ? 'Admin Laboratorium Komputer'
      : resolvedRole === 'guru'
      ? 'Guru Pengampu SMANSATEKUN'
      : 'Akun Google Belum Terdaftar (Baca Saja)';

  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      if (fbUser.emailVerified) {
        await setDoc(userRef, {
          uid,
          namaLengkap: defaultName,
          email: clampStr(email || `${uid}@smansatekun.sch.id`, 160),
          jabatan: defaultJabatan,
          role: resolvedRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return {
        user: {
          id: uid,
          username: email || uid,
          namaLengkap: defaultName,
          jabatan: defaultJabatan,
          role: resolvedRole,
          loginAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
        isApprovedStaff: resolvedRole !== 'guest',
      };
    }

    const data = snap.data();
    return {
      user: {
        id: uid,
        username: (data.email as string) || email || uid,
        namaLengkap: (data.namaLengkap as string) || defaultName,
        jabatan: resolvedRole === 'guest' ? defaultJabatan : (data.jabatan as string) || defaultJabatan,
        role: resolvedRole,
        loginAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
      isApprovedStaff: resolvedRole !== 'guest',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Seed initial SMANSATEKUN records to Firestore once when Admin signs in and collections are empty.
 */
export async function seedInitialCollectionsIfEmpty(adminUser: AuthUser): Promise<boolean> {
  if (adminUser.role !== 'admin') return false;

  try {
    const [invCheck, igCheck] = await Promise.all([
      getDocs(query(collection(db, 'inventaris'), where('visibility', '==', 'public'))),
      getDocs(query(collection(db, 'instagramPosts'), where('visibility', '==', 'public'))),
    ]);

    if (!invCheck.empty && !igCheck.empty) {
      return false;
    }

    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (igCheck.empty) {
      for (const ig of INITIAL_INSTAGRAM_POSTS) {
        batch.set(doc(db, 'instagramPosts', ig.id), {
          judul: clampStr(ig.judul, 200),
          akunInstagram: clampStr(ig.akunInstagram, 60, '@smansatekun'),
          tanggal: clampStr(ig.tanggal, 40),
          postUrl: sanitizeInstagramUrl(ig.postUrl) ?? 'https://www.instagram.com/smansatekun/',
          imageUrl: sanitizeImageUrl(ig.imageUrl) ?? '/src/assets/images/galeri_praktikum_kka_1795043210630.jpg',
          uploaderId: adminUser.id,
          uploaderName: clampStr(adminUser.namaLengkap, 120),
          uploaderRole: 'admin',
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (invCheck.empty) {
      for (const item of INITIAL_DOKUMENTASI) {
        batch.set(doc(db, 'dokumentasi', item.id), {
          judul: clampStr(item.judul, 160),
          kategori: item.kategori,
          bulan: item.bulan,
          tanggal: item.tanggal,
          deskripsi: clampStr(item.deskripsi, 1000),
          imageUrl: sanitizeImageUrl(item.imageUrl) ?? '/src/assets/images/galeri_praktikum_kka_1795043210630.jpg',
          uploaderId: adminUser.id,
          uploaderName: clampStr(item.uploaderName, 120),
          uploaderRole: 'admin',
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const b of INITIAL_BERITA) {
        batch.set(doc(db, 'berita', b.id), {
          judul: clampStr(b.judul, 200),
          sumber: clampStr(b.sumber, 80),
          tanggal: clampStr(b.tanggal, 40),
          ringkasan: clampStr(b.ringkasan, 600),
          url: sanitizeExternalUrl(b.url) ?? 'https://www.kompas.com/',
          thumbnailUrl: sanitizeImageUrl(b.thumbnailUrl) ?? '/src/assets/images/berita_prestasi_sman1_1795043211512.jpg',
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const j of INITIAL_JABATAN) {
        const payload: Record<string, unknown> = {
          nama: clampStr(j.nama, 120),
          nip: clampStr(j.nip, 40),
          jabatan: clampStr(j.jabatan, 120),
          tingkat: j.tingkat,
          tugasPokok: clampStr(j.tugasPokok, 800),
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        };
        const cleanAvatar = clampOptionalImage(j.avatarUrl);
        if (cleanAvatar) payload.avatarUrl = cleanAvatar;
        batch.set(doc(db, 'jabatan', j.id), payload);
      }

      for (const c of INITIAL_LMS_COURSES) {
        batch.set(doc(db, 'lmsCourses', c.id), {
          kode: clampStr(c.kode, 40),
          nama: clampStr(c.nama, 120),
          kelas: c.kelas,
          guruPengampu: clampStr(c.guruPengampu, 120),
          ruangLab: clampStr(c.ruangLab, 80),
          jadwal: clampStr(c.jadwal, 80),
          deskripsi: clampStr(c.deskripsi, 800),
          modul: c.modul.slice(0, 30),
          tugas: c.tugas.slice(0, 30),
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const s of INITIAL_STUDENTS) {
        batch.set(doc(db, 'poinMurid', s.id), {
          nis: clampStr(s.nis, 32),
          nama: clampStr(s.nama, 120),
          kelas: clampStr(s.kelas, 40),
          poinPrestasi: Math.max(0, Math.min(10000, s.poinPrestasi)),
          poinPelanggaran: Math.max(0, Math.min(10000, s.poinPelanggaran)),
          riwayat: s.riwayat.slice(0, 50),
          ownerId: adminUser.id,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const inv of INITIAL_INVENTORY) {
        const payload: Record<string, unknown> = {
          kodeBarang: clampStr(inv.kodeBarang, 60),
          kategori: inv.kategori,
          namaPerangkat: clampStr(inv.namaPerangkat, 140),
          spesifikasi: clampStr(inv.spesifikasi, 400),
          lokasi: clampStr(inv.lokasi, 100),
          kondisi: inv.kondisi,
          keterangan: clampStr(inv.keterangan, 800),
          terakhirDiperiksa: clampStr(inv.terakhirDiperiksa, 40),
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        };
        const cleanFoto = clampOptionalImage(inv.fotoKerusakan);
        if (cleanFoto) payload.fotoKerusakan = cleanFoto;
        batch.set(doc(db, 'inventaris', inv.id), payload);
      }

      for (const req of INITIAL_PROCUREMENT) {
        batch.set(doc(db, 'permintaan', req.id), {
          namaPerangkat: clampStr(req.namaPerangkat, 140),
          spesifikasiSingkat: clampStr(req.spesifikasiSingkat, 500),
          jumlah: Math.max(1, Math.min(1000, req.jumlah)),
          estimasiHarga: Math.max(0, Math.min(10000000000, req.estimasiHarga)),
          urgensi: req.urgensi,
          status: req.status,
          tahunAnggaran: req.tahunAnggaran,
          pengusul: clampStr(req.pengusul, 120),
          creatorUid: adminUser.id,
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  }
}

// ============================================================================
// Real-time Subscriptions (onSnapshot with mandatory error handlers)
// ============================================================================

export function subscribePublicCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[], hasDocs: boolean) => void
): Unsubscribe {
  const q = query(collection(db, collectionName), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<T, 'id'>),
        id: d.id,
      })) as T[];
      onData(items, !snapshot.empty);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export function subscribeStudentPoints(
  uid: string,
  isBootstrappedAdmin: boolean,
  onData: (items: StudentPoint[], hasDocs: boolean) => void
): Unsubscribe {
  const colRef = collection(db, 'poinMurid');
  const q = isBootstrappedAdmin ? colRef : query(colRef, where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<StudentPoint, 'id'>),
        id: d.id,
      }));
      onData(items, !snapshot.empty);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'poinMurid');
    }
  );
}

export function subscribeApprovedStaff(
  onData: (items: ApprovedStaffItem[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'approvedStaff'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<ApprovedStaffItem, 'id'>),
        id: d.id,
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'approvedStaff');
    }
  );
}

// ============================================================================
// Admin Staff Whitelist Management (Anti-Hacker Access Control)
// ============================================================================

export async function addApprovedStaffDoc(
  data: { email: string; nama: string; jabatan: string },
  adminUid: string
): Promise<void> {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }
  const staffKey = emailToSafeDocId(cleanEmail);
  const path = `approvedStaff/${staffKey}`;
  try {
    await setDoc(doc(db, 'approvedStaff', staffKey), {
      email: clampStr(cleanEmail, 160),
      nama: clampStr(data.nama, 120),
      jabatan: clampStr(data.jabatan, 120, 'Guru Pengampu'),
      addedBy: adminUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeApprovedStaffDoc(staffKey: string): Promise<void> {
  const path = `approvedStaff/${staffKey}`;
  try {
    await deleteDoc(doc(db, 'approvedStaff', staffKey));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// CRUD Mutations with Security Sanitization & Volumetric Constraints
// ============================================================================

export async function createDokumentasiDoc(
  data: Omit<DokumentasiItem, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>,
  user: AuthUser
): Promise<void> {
  const safeImage = sanitizeImageUrl(data.imageUrl);
  if (!safeImage) {
    throw new Error('URL atau berkas gambar tidak valid.');
  }
  const id = createFirestoreId('dok');
  const path = `dokumentasi/${id}`;
  try {
    await setDoc(doc(db, 'dokumentasi', id), {
      judul: clampStr(data.judul, 160),
      kategori: data.kategori,
      bulan: data.bulan,
      tanggal: clampStr(data.tanggal, 10, '2026-01-01'),
      deskripsi: clampStr(data.deskripsi, 1000),
      imageUrl: safeImage,
      uploaderId: user.id,
      uploaderName: clampStr(user.namaLengkap, 120),
      uploaderRole: user.role === 'admin' ? 'admin' : 'guru',
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDokumentasiDoc(
  id: string,
  data: Omit<DokumentasiItem, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
): Promise<void> {
  const safeImage = sanitizeImageUrl(data.imageUrl);
  if (!safeImage) {
    throw new Error('URL atau berkas gambar tidak valid.');
  }
  const path = `dokumentasi/${id}`;
  try {
    await updateDoc(doc(db, 'dokumentasi', id), {
      judul: clampStr(data.judul, 160),
      kategori: data.kategori,
      bulan: data.bulan,
      tanggal: clampStr(data.tanggal, 10, '2026-01-01'),
      deskripsi: clampStr(data.deskripsi, 1000),
      imageUrl: safeImage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDokumentasiDoc(id: string): Promise<void> {
  const path = `dokumentasi/${id}`;
  try {
    await deleteDoc(doc(db, 'dokumentasi', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createInstagramPostDoc(
  data: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>,
  user: AuthUser
): Promise<void> {
  const safePostUrl = sanitizeInstagramUrl(data.postUrl);
  const safeImgUrl = sanitizeImageUrl(data.imageUrl);
  if (!safePostUrl) {
    throw new Error('Link harus berasal dari domain resmi instagram.com.');
  }
  if (!safeImgUrl) {
    throw new Error('Gambar pratinjau Instagram tidak valid.');
  }
  const id = createFirestoreId('ig');
  const path = `instagramPosts/${id}`;
  try {
    await setDoc(doc(db, 'instagramPosts', id), {
      judul: clampStr(data.judul, 200),
      akunInstagram: clampStr(data.akunInstagram, 60, '@smansatekun'),
      tanggal: clampStr(data.tanggal, 40),
      postUrl: safePostUrl,
      imageUrl: safeImgUrl,
      uploaderId: user.id,
      uploaderName: clampStr(user.namaLengkap, 120),
      uploaderRole: user.role === 'admin' ? 'admin' : 'guru',
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInstagramPostDoc(
  id: string,
  data: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
): Promise<void> {
  const safePostUrl = sanitizeInstagramUrl(data.postUrl);
  const safeImgUrl = sanitizeImageUrl(data.imageUrl);
  if (!safePostUrl || !safeImgUrl) {
    throw new Error('Tautan Instagram atau gambar pratinjau tidak valid.');
  }
  const path = `instagramPosts/${id}`;
  try {
    await updateDoc(doc(db, 'instagramPosts', id), {
      judul: clampStr(data.judul, 200),
      akunInstagram: clampStr(data.akunInstagram, 60, '@smansatekun'),
      tanggal: clampStr(data.tanggal, 40),
      postUrl: safePostUrl,
      imageUrl: safeImgUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInstagramPostDoc(id: string): Promise<void> {
  const path = `instagramPosts/${id}`;
  try {
    await deleteDoc(doc(db, 'instagramPosts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createBeritaDoc(item: Omit<BeritaItem, 'id'>): Promise<void> {
  const safeUrl = sanitizeExternalUrl(item.url);
  const safeThumb = sanitizeImageUrl(item.thumbnailUrl);
  if (!safeUrl || !safeThumb) {
    throw new Error('Tautan berita atau gambar thumbnail tidak valid.');
  }
  const id = createFirestoreId('news');
  const path = `berita/${id}`;
  try {
    await setDoc(doc(db, 'berita', id), {
      judul: clampStr(item.judul, 200),
      sumber: clampStr(item.sumber, 80),
      tanggal: clampStr(item.tanggal, 40),
      ringkasan: clampStr(item.ringkasan, 600),
      url: safeUrl,
      thumbnailUrl: safeThumb,
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBeritaDoc(updated: BeritaItem): Promise<void> {
  const safeUrl = sanitizeExternalUrl(updated.url);
  const safeThumb = sanitizeImageUrl(updated.thumbnailUrl);
  if (!safeUrl || !safeThumb) {
    throw new Error('Tautan berita atau gambar thumbnail tidak valid.');
  }
  const path = `berita/${updated.id}`;
  try {
    await updateDoc(doc(db, 'berita', updated.id), {
      judul: clampStr(updated.judul, 200),
      sumber: clampStr(updated.sumber, 80),
      tanggal: clampStr(updated.tanggal, 40),
      ringkasan: clampStr(updated.ringkasan, 600),
      url: safeUrl,
      thumbnailUrl: safeThumb,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBeritaDoc(id: string): Promise<void> {
  const path = `berita/${id}`;
  try {
    await deleteDoc(doc(db, 'berita', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createJabatanDoc(item: Omit<JabatanItem, 'id'>): Promise<void> {
  const id = createFirestoreId('jab');
  const path = `jabatan/${id}`;
  const payload: Record<string, unknown> = {
    nama: clampStr(item.nama, 120),
    nip: clampStr(item.nip, 40),
    jabatan: clampStr(item.jabatan, 120),
    tingkat: item.tingkat,
    tugasPokok: clampStr(item.tugasPokok, 800),
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const cleanAvatar = clampOptionalImage(item.avatarUrl);
  if (cleanAvatar) payload.avatarUrl = cleanAvatar;
  try {
    await setDoc(doc(db, 'jabatan', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateJabatanDoc(updated: JabatanItem): Promise<void> {
  const path = `jabatan/${updated.id}`;
  const cleanAvatar = clampOptionalImage(updated.avatarUrl);
  try {
    await updateDoc(doc(db, 'jabatan', updated.id), {
      nama: clampStr(updated.nama, 120),
      nip: clampStr(updated.nip, 40),
      jabatan: clampStr(updated.jabatan, 120),
      tingkat: updated.tingkat,
      tugasPokok: clampStr(updated.tugasPokok, 800),
      avatarUrl: cleanAvatar ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJabatanDoc(id: string): Promise<void> {
  const path = `jabatan/${id}`;
  try {
    await deleteDoc(doc(db, 'jabatan', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateLmsModulesDoc(
  courseId: string,
  modul: LmsCourse['modul']
): Promise<void> {
  const path = `lmsCourses/${courseId}`;
  try {
    await updateDoc(doc(db, 'lmsCourses', courseId), {
      modul: modul.slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createStudentPointDoc(
  data: { nis: string; nama: string; kelas: string },
  ownerId: string
): Promise<void> {
  const id = createFirestoreId('std');
  const path = `poinMurid/${id}`;
  try {
    await setDoc(doc(db, 'poinMurid', id), {
      nis: clampStr(data.nis, 32),
      nama: clampStr(data.nama, 120),
      kelas: clampStr(data.kelas, 40),
      poinPrestasi: 0,
      poinPelanggaran: 0,
      riwayat: [],
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudentPointsDoc(
  studentId: string,
  poinPrestasi: number,
  poinPelanggaran: number,
  riwayat: StudentPoint['riwayat']
): Promise<void> {
  const path = `poinMurid/${studentId}`;
  try {
    await updateDoc(doc(db, 'poinMurid', studentId), {
      poinPrestasi: Math.max(0, Math.min(10000, poinPrestasi)),
      poinPelanggaran: Math.max(0, Math.min(10000, poinPelanggaran)),
      riwayat: riwayat.slice(0, 50),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createInventoryDoc(
  item: Omit<InventoryItem, 'id' | 'terakhirDiperiksa'>,
  terakhirDiperiksa: string
): Promise<void> {
  const id = createFirestoreId('inv');
  const path = `inventaris/${id}`;
  const payload: Record<string, unknown> = {
    kodeBarang: clampStr(item.kodeBarang, 60),
    kategori: item.kategori,
    namaPerangkat: clampStr(item.namaPerangkat, 140),
    spesifikasi: clampStr(item.spesifikasi, 400),
    lokasi: clampStr(item.lokasi, 100),
    kondisi: item.kondisi,
    keterangan: clampStr(item.keterangan, 800),
    terakhirDiperiksa: clampStr(terakhirDiperiksa, 40),
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const cleanFoto = clampOptionalImage(item.fotoKerusakan);
  if (cleanFoto) payload.fotoKerusakan = cleanFoto;
  try {
    await setDoc(doc(db, 'inventaris', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInventoryDoc(
  updated: InventoryItem,
  isAdmin: boolean
): Promise<void> {
  const path = `inventaris/${updated.id}`;
  const cleanFoto = clampOptionalImage(updated.fotoKerusakan);
  const payload: Record<string, unknown> = isAdmin
    ? {
        kodeBarang: clampStr(updated.kodeBarang, 60),
        kategori: updated.kategori,
        namaPerangkat: clampStr(updated.namaPerangkat, 140),
        spesifikasi: clampStr(updated.spesifikasi, 400),
        lokasi: clampStr(updated.lokasi, 100),
        kondisi: updated.kondisi,
        keterangan: clampStr(updated.keterangan, 800),
        fotoKerusakan: cleanFoto ?? deleteField(),
        terakhirDiperiksa: clampStr(updated.terakhirDiperiksa, 40),
        updatedAt: serverTimestamp(),
      }
    : {
        kondisi: updated.kondisi,
        keterangan: clampStr(updated.keterangan, 800),
        fotoKerusakan: cleanFoto ?? deleteField(),
        terakhirDiperiksa: clampStr(updated.terakhirDiperiksa, 40),
        updatedAt: serverTimestamp(),
      };
  try {
    await updateDoc(doc(db, 'inventaris', updated.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInventoryDoc(id: string): Promise<void> {
  const path = `inventaris/${id}`;
  try {
    await deleteDoc(doc(db, 'inventaris', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createProcurementDoc(
  req: Omit<ProcurementRequest, 'id'>,
  creatorUid: string,
  isAdmin: boolean
): Promise<void> {
  const id = createFirestoreId('req');
  const path = `permintaan/${id}`;
  try {
    await setDoc(doc(db, 'permintaan', id), {
      namaPerangkat: clampStr(req.namaPerangkat, 140),
      spesifikasiSingkat: clampStr(req.spesifikasiSingkat, 500),
      jumlah: Math.max(1, Math.min(1000, Number(req.jumlah) || 1)),
      estimasiHarga: Math.max(0, Math.min(10000000000, Number(req.estimasiHarga) || 0)),
      urgensi: req.urgensi,
      status: isAdmin ? req.status : 'Menunggu',
      tahunAnggaran: req.tahunAnggaran,
      pengusul: clampStr(req.pengusul, 120),
      creatorUid,
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProcurementDoc(
  updated: ProcurementRequest,
  isAdmin: boolean
): Promise<void> {
  const path = `permintaan/${updated.id}`;
  const baseFields: Record<string, unknown> = {
    namaPerangkat: clampStr(updated.namaPerangkat, 140),
    spesifikasiSingkat: clampStr(updated.spesifikasiSingkat, 500),
    jumlah: Math.max(1, Math.min(1000, Number(updated.jumlah) || 1)),
    estimasiHarga: Math.max(0, Math.min(10000000000, Number(updated.estimasiHarga) || 0)),
    urgensi: updated.urgensi,
    tahunAnggaran: updated.tahunAnggaran,
    pengusul: clampStr(updated.pengusul, 120),
    updatedAt: serverTimestamp(),
  };
  if (isAdmin) {
    baseFields.status = updated.status;
  }
  try {
    await updateDoc(doc(db, 'permintaan', updated.id), baseFields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProcurementDoc(id: string): Promise<void> {
  const path = `permintaan/${id}`;
  try {
    await deleteDoc(doc(db, 'permintaan', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
