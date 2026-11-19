/**
 * Phase 0 Security Rules Verification Suite (Dirty Dozen Test Specification)
 * Intended for verification against the Firebase Local Emulator Suite
 * (`@firebase/rules-unit-testing`).
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Self-Role Escalation on user profile creation',
    collectionPath: 'users/guru-1',
    operation: 'create',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: {
      uid: 'guru-1',
      namaLengkap: 'Guru Uji',
      email: 'guru@school.sch.id',
      jabatan: 'Guru',
      role: 'admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role Tampering on user profile update',
    collectionPath: 'users/guru-1',
    operation: 'update',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: { role: 'admin' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User PII Read on /users/{otherUid}',
    collectionPath: 'users/admin-1',
    operation: 'get',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Email Spoofing as Bootstrapped Admin',
    collectionPath: 'berita/news-spoof',
    operation: 'create',
    auth: { uid: 'attacker', email: 'Rahmat0042@gmail.com', email_verified: false },
    payload: {
      judul: 'Berita Palsu',
      sumber: 'Spoof',
      tanggal: '19 Nov 2026',
      ringkasan: 'Ringkasan',
      url: 'https://example.com',
      thumbnailUrl: 'https://example.com/a.jpg',
      visibility: 'public',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on /inventaris create',
    collectionPath: 'inventaris/inv-shadow',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'Rahmat0042@gmail.com', email_verified: true },
    payload: {
      kodeBarang: 'LAB-01',
      kategori: 'Laptop',
      namaPerangkat: 'Laptop Test',
      spesifikasi: 'Core i5',
      lokasi: 'Lab 1',
      kondisi: 'Normal',
      keterangan: 'Baik',
      terakhirDiperiksa: '19 Nov 2026',
      visibility: 'public',
      isVerified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning with invalid characters on /inventaris',
    collectionPath: 'inventaris/bad id with spaces!!!',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'Rahmat0042@gmail.com', email_verified: true },
    payload: {
      kodeBarang: 'LAB-02',
      kategori: 'Laptop',
      namaPerangkat: 'Laptop Poison',
      spesifikasi: 'Core i5',
      lokasi: 'Lab 1',
      kondisi: 'Normal',
      keterangan: 'Baik',
      terakhirDiperiksa: '19 Nov 2026',
      visibility: 'public',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Uploader Identity Spoofing on /dokumentasi create',
    collectionPath: 'dokumentasi/dok-spoof',
    operation: 'create',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: {
      judul: 'Kegiatan Palsu',
      kategori: 'KKA',
      bulan: 'Januari',
      tanggal: '2026-01-12',
      deskripsi: 'Deskripsi',
      imageUrl: 'https://example.com/img.jpg',
      uploaderId: 'someone-else-uid',
      uploaderName: 'Guru',
      uploaderRole: 'guru',
      visibility: 'public',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery on /dokumentasi create',
    collectionPath: 'dokumentasi/dok-time',
    operation: 'create',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: {
      judul: 'Kegiatan',
      kategori: 'KKA',
      bulan: 'Januari',
      tanggal: '2026-01-12',
      deskripsi: 'Deskripsi',
      imageUrl: 'https://example.com/img.jpg',
      uploaderId: 'guru-1',
      uploaderName: 'Guru',
      uploaderRole: 'guru',
      visibility: 'public',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation (uploaderId) on /dokumentasi update',
    collectionPath: 'dokumentasi/dok-1',
    operation: 'update',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: { uploaderId: 'hijacked-uid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Bypass on approved /permintaan',
    collectionPath: 'permintaan/req-approved',
    operation: 'update',
    auth: { uid: 'guru-1', email: 'guru@school.sch.id', email_verified: true },
    payload: { status: 'Menunggu' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning with invalid kondisi enum and oversized string',
    collectionPath: 'inventaris/inv-1',
    operation: 'update',
    auth: { uid: 'admin-uid', email: 'Rahmat0042@gmail.com', email_verified: true },
    payload: {
      namaPerangkat: 'X'.repeat(500),
      kondisi: 'Hilang',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthenticated list on sensitive student PII /poinMurid',
    collectionPath: 'poinMurid',
    operation: 'list',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'External non-whitelisted Google account self-registering into /approvedStaff',
    collectionPath: 'approvedStaff/hacker_gmail_com',
    operation: 'create',
    auth: { uid: 'outsider-1', email: 'hacker@gmail.com', email_verified: true },
    payload: {
      email: 'hacker@gmail.com',
      nama: 'Hacker',
      jabatan: 'Guru',
      addedBy: 'outsider-1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 14,
    name: 'Phishing / non-Instagram URL spoofing on /instagramPosts create',
    collectionPath: 'instagramPosts/ig-phish',
    operation: 'create',
    auth: { uid: 'admin-uid', email: 'Rahmat0042@gmail.com', email_verified: true },
    payload: {
      judul: 'Postingan Phishing',
      akunInstagram: '@smansatekun',
      tanggal: '19 Nov 2026',
      postUrl: 'https://evil-instagram.com/p/fake',
      imageUrl: 'https://example.com/img.jpg',
      uploaderId: 'admin-uid',
      uploaderName: 'Admin',
      uploaderRole: 'admin',
      visibility: 'public',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
