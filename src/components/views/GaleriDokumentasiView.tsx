import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  Search,
  Calendar,
  Camera,
  Pencil,
  Trash2,
  Plus,
  X,
  Upload,
  Newspaper,
  User,
  Instagram,
  Link2,
  ImagePlus,
} from 'lucide-react';
import {
  AuthUser,
  BeritaItem,
  BULAN_INDONESIA,
  BulanIndonesia,
  DokumentasiItem,
  InstagramPost,
  KATEGORI_DOKUMENTASI,
  KategoriDokumentasi,
} from '../../types/smansatekun';
import {
  sanitizeExternalUrl,
  sanitizeImageUrl,
  sanitizeInstagramUrl,
} from '../../utils/security';
import { Modal, ConfirmDialog } from '../ui/Modal';

interface GaleriDokumentasiViewProps {
  dokumentasi: DokumentasiItem[];
  berita: BeritaItem[];
  instagramPosts: InstagramPost[];
  currentUser: AuthUser;
  onOpenUpload: (editItem?: DokumentasiItem) => void;
  onDeleteDokumentasi: (id: string) => void;
  onAddBerita: (item: Omit<BeritaItem, 'id'>) => void;
  onUpdateBerita: (item: BeritaItem) => void;
  onDeleteBerita: (id: string) => void;
  onAddInstagram: (
    item: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
  ) => void;
  onUpdateInstagram: (
    id: string,
    item: Omit<InstagramPost, 'id' | 'uploaderId' | 'uploaderName' | 'uploaderRole'>
  ) => void;
  onDeleteInstagram: (id: string) => void;
}

function formatDateId(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 ${className ?? ''}`}
      >
        <Camera className="w-7 h-7 mb-1.5" />
        <span className="text-[11px] font-medium px-2 text-center">Dokumentasi SMANSATEKUN</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const MAX_FIRESTORE_IMAGE_CHARS = 185000;

function compressInstagramImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses gambar.'));
          return;
        }
        let maxDim = 900;
        let quality = 0.78;
        let dataUrl = '';

        for (let attempt = 0; attempt < 6; attempt++) {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length <= MAX_FIRESTORE_IMAGE_CHARS) {
            resolve(dataUrl);
            return;
          }
          maxDim = Math.round(maxDim * 0.78);
          quality = Math.max(0.45, quality - 0.08);
        }

        if (dataUrl.length <= MAX_FIRESTORE_IMAGE_CHARS) {
          resolve(dataUrl);
        } else {
          reject(new Error('Ukuran gambar terlalu besar untuk disimpan. Pilih gambar lebih kecil.'));
        }
      };
      img.onerror = () => reject(new Error('Berkas gambar tidak dapat dibaca.'));
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });
}

export function GaleriDokumentasiView({
  dokumentasi,
  berita,
  instagramPosts,
  currentUser,
  onOpenUpload,
  onDeleteDokumentasi,
  onAddBerita,
  onUpdateBerita,
  onDeleteBerita,
  onAddInstagram,
  onUpdateInstagram,
  onDeleteInstagram,
}: GaleriDokumentasiViewProps) {
  const [selectedBulan, setSelectedBulan] = useState<'Semua Bulan' | BulanIndonesia>('Semua Bulan');
  const [selectedKategori, setSelectedKategori] = useState<'Semua' | KategoriDokumentasi>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox Pratinjau Foto
  const [lightboxItem, setLightboxItem] = useState<DokumentasiItem | null>(null);

  // Hapus Dokumentasi
  const [deleteDokTarget, setDeleteDokTarget] = useState<DokumentasiItem | null>(null);

  // CRUD Berita Media (Khusus Admin)
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<BeritaItem | null>(null);
  const [newsJudul, setNewsJudul] = useState('');
  const [newsSumber, setNewsSumber] = useState('');
  const [newsTanggal, setNewsTanggal] = useState('');
  const [newsRingkasan, setNewsRingkasan] = useState('');
  const [newsUrl, setNewsUrl] = useState('');
  const [newsThumb, setNewsThumb] = useState('');
  const [newsError, setNewsError] = useState('');
  const [deleteNewsTarget, setDeleteNewsTarget] = useState<BeritaItem | null>(null);

  // CRUD Postingan Instagram (Admin & Guru Terdaftar)
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [editingIg, setEditingIg] = useState<InstagramPost | null>(null);
  const [igJudul, setIgJudul] = useState('');
  const [igAkun, setIgAkun] = useState('@smansatekun.official');
  const [igTanggal, setIgTanggal] = useState('');
  const [igPostUrl, setIgPostUrl] = useState('');
  const [igImageUrl, setIgImageUrl] = useState('');
  const [igImgMode, setIgImgMode] = useState<'upload' | 'url'>('upload');
  const [igError, setIgError] = useState('');
  const [deleteIgTarget, setDeleteIgTarget] = useState<InstagramPost | null>(null);

  const isLoggedIn = currentUser.role !== 'guest';
  const isAdmin = currentUser.role === 'admin';
  const canEditDok = (item: DokumentasiItem) =>
    isAdmin || (currentUser.role === 'guru' && item.uploaderId === currentUser.id);
  const canEditIg = (item: InstagramPost) =>
    isAdmin || (currentUser.role === 'guru' && item.uploaderId === currentUser.id);

  const filteredDokumentasi = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dokumentasi.filter((item) => {
      const matchBulan = selectedBulan === 'Semua Bulan' || item.bulan === selectedBulan;
      const matchKat = selectedKategori === 'Semua' || item.kategori === selectedKategori;
      const matchSearch =
        !q ||
        item.judul.toLowerCase().includes(q) ||
        item.deskripsi.toLowerCase().includes(q) ||
        item.uploaderName.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q);
      return matchBulan && matchKat && matchSearch;
    });
  }, [dokumentasi, selectedBulan, selectedKategori, searchQuery]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of dokumentasi) {
      counts[item.bulan] = (counts[item.bulan] || 0) + 1;
    }
    return counts;
  }, [dokumentasi]);

  const openAddNewsModal = () => {
    setEditingNews(null);
    setNewsJudul('');
    setNewsSumber('Riau Pos');
    setNewsTanggal(
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );
    setNewsRingkasan('');
    setNewsUrl('https://');
    setNewsThumb('/src/assets/images/berita_prestasi_sman1_1795043211512.jpg');
    setNewsError('');
    setNewsModalOpen(true);
  };

  const openEditNewsModal = (item: BeritaItem) => {
    setEditingNews(item);
    setNewsJudul(item.judul);
    setNewsSumber(item.sumber);
    setNewsTanggal(item.tanggal);
    setNewsRingkasan(item.ringkasan);
    setNewsUrl(item.url);
    setNewsThumb(item.thumbnailUrl);
    setNewsError('');
    setNewsModalOpen(true);
  };

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsJudul.trim() || !newsSumber.trim() || !newsUrl.trim()) {
      setNewsError('Judul berita, nama media, dan tautan URL wajib diisi.');
      return;
    }

    const safeNewsUrl = sanitizeExternalUrl(newsUrl);
    if (!safeNewsUrl) {
      setNewsError('Tautan URL berita tidak valid. Gunakan protokol https:// yang sah.');
      return;
    }

    const rawThumb = newsThumb.trim() || '/src/assets/images/berita_prestasi_sman1_1795043211512.jpg';
    const safeThumb = sanitizeImageUrl(rawThumb);
    if (!safeThumb) {
      setNewsError('URL gambar thumbnail tidak valid atau tidak didukung.');
      return;
    }

    const payload = {
      judul: newsJudul.trim(),
      sumber: newsSumber.trim(),
      tanggal: newsTanggal.trim() || 'Nov 2026',
      ringkasan: newsRingkasan.trim() || 'Liputan kegiatan pendidikan dan inovasi SMAN 1 Teluk Kuantan.',
      url: safeNewsUrl,
      thumbnailUrl: safeThumb,
    };

    if (editingNews) {
      onUpdateBerita({ ...editingNews, ...payload });
    } else {
      onAddBerita(payload);
    }
    setNewsModalOpen(false);
  };

  const openAddIgModal = () => {
    setEditingIg(null);
    setIgJudul('');
    setIgAkun('@smansatekun.official');
    setIgTanggal(
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );
    setIgPostUrl('https://www.instagram.com/p/');
    setIgImageUrl('');
    setIgImgMode('upload');
    setIgError('');
    setIgModalOpen(true);
  };

  const openEditIgModal = (item: InstagramPost) => {
    setEditingIg(item);
    setIgJudul(item.judul);
    setIgAkun(item.akunInstagram);
    setIgTanggal(item.tanggal);
    setIgPostUrl(item.postUrl);
    setIgImageUrl(item.imageUrl);
    setIgImgMode(item.imageUrl.startsWith('data:') ? 'upload' : 'url');
    setIgError('');
    setIgModalOpen(true);
  };

  const handleIgImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setIgError('Format gambar harus JPG, PNG, atau WebP.');
      return;
    }
    setIgError('');
    try {
      const compressed = await compressInstagramImage(file);
      setIgImageUrl(compressed);
    } catch (err) {
      setIgError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    }
  };

  const handleIgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIgError('');

    const safePostUrl = sanitizeInstagramUrl(igPostUrl);
    if (!safePostUrl) {
      setIgError(
        'Tautan harus berupa link postingan resmi Instagram (contoh: https://www.instagram.com/p/...).'
      );
      return;
    }
    if (!igJudul.trim()) {
      setIgError('Judul atau caption singkat postingan Instagram wajib diisi.');
      return;
    }
    const rawImg = igImageUrl.trim() || '/src/assets/images/galeri_praktikum_kka_1795043210630.jpg';
    const safeImg = sanitizeImageUrl(rawImg);
    if (!safeImg) {
      setIgError('Gambar pratinjau tidak valid. Unggah gambar JPG/PNG/WebP atau masukkan URL https://.');
      return;
    }

    const formattedAkun = igAkun.trim()
      ? igAkun.trim().startsWith('@')
        ? igAkun.trim()
        : `@${igAkun.trim()}`
      : '@smansatekun.official';

    const payload = {
      judul: igJudul.trim(),
      akunInstagram: formattedAkun,
      tanggal: igTanggal.trim() || 'Nov 2026',
      postUrl: safePostUrl,
      imageUrl: safeImg,
    };

    if (editingIg) {
      onUpdateInstagram(editingIg.id, payload);
    } else {
      onAddInstagram(payload);
    }
    setIgModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Bagian 1: Berita & Liputan Media (Tautan Koran Online) */}
      <section aria-labelledby="section-berita-title" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#0284C7]">
              SMAN 1 Teluk Kuantan · Publikasi Digital
            </p>
            <h2
              id="section-berita-title"
              className="mt-0.5 text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight"
            >
              Berita & Liputan Media
            </h2>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={openAddNewsModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Berita
              </button>
            )}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => onOpenUpload()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0284C7] px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-xs whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Dokumentasi
              </button>
            )}
          </div>
        </div>

        {/* Strip Kartu Berita Horizontal / Grid Responsif */}
        {berita.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Belum ada tautan berita media yang ditayangkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {berita.map((news) => (
              <article
                key={news.id}
                className="group flex flex-col rounded-2xl bg-white border border-slate-200 overflow-hidden hover:border-sky-300 transition-colors"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <ImageWithFallback
                    src={news.thumbnailUrl}
                    alt={news.judul}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex-1 flex flex-col p-4">
                  {/* Metadata Unboxed: Sumber · Tanggal */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Newspaper className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                    <span className="font-semibold text-[#0F172A] truncate">{news.sumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] whitespace-nowrap">{news.tanggal}</span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-[#0F172A] leading-snug line-clamp-2">
                    {news.judul}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {news.ringkasan}
                  </p>

                  <div className="mt-auto pt-3.5 flex items-center justify-between gap-2 border-t border-slate-100">
                    <a
                      href={sanitizeExternalUrl(news.url) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-sky-800 transition-colors whitespace-nowrap"
                    >
                      Buka Berita
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditNewsModal(news)}
                          aria-label={`Edit berita ${news.judul}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284C7] hover:bg-sky-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteNewsTarget(news)}
                          aria-label={`Hapus berita ${news.judul}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Pemisah Halus */}
      <hr className="border-slate-200/80" />

      {/* Bagian 1B: Postingan Instagram SMANSATEKUN */}
      <section aria-labelledby="section-instagram-title" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7]">
              <Instagram className="w-3.5 h-3.5" />
              Sorotan Media Sosial Resmi
            </p>
            <h2
              id="section-instagram-title"
              className="mt-0.5 text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight"
            >
              Postingan Instagram SMANSATEKUN
            </h2>
          </div>

          {isLoggedIn && (
            <button
              type="button"
              onClick={openAddIgModal}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Postingan IG
            </button>
          )}
        </div>

        {instagramPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Belum ada tautan postingan Instagram yang ditampilkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {instagramPosts.map((post) => {
              const safeIgUrl =
                sanitizeInstagramUrl(post.postUrl) ?? 'https://www.instagram.com/';
              const editableIg = canEditIg(post);

              return (
                <article
                  key={post.id}
                  className="group flex flex-col rounded-2xl bg-white border border-slate-200 overflow-hidden hover:border-sky-300 transition-colors"
                >
                  <a
                    href={safeIgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 block"
                  >
                    <ImageWithFallback
                      src={post.imageUrl}
                      alt={post.judul}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </a>

                  <div className="flex-1 flex flex-col p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A] truncate">
                        <Instagram className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                        <span className="truncate">{post.akunInstagram}</span>
                      </span>
                      <span className="font-mono text-[11px] whitespace-nowrap shrink-0">
                        {post.tanggal}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[#0F172A] leading-snug line-clamp-2">
                      {post.judul}
                    </p>

                    <div className="mt-auto pt-3.5 mt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                      <a
                        href={safeIgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-sky-800 transition-colors whitespace-nowrap"
                      >
                        Buka di Instagram
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {editableIg && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditIgModal(post)}
                            aria-label={`Edit postingan ${post.judul}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284C7] hover:bg-sky-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteIgTarget(post)}
                            aria-label={`Hapus postingan ${post.judul}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Pemisah Halus */}
      <hr className="border-slate-200/80" />

      {/* Bagian 2: Galeri Dokumentasi Sekolah dengan Filter Bulan & Mata Pelajaran */}
      <section aria-labelledby="section-galeri-title" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2
              id="section-galeri-title"
              className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight"
            >
              Galeri Dokumentasi Kegiatan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Arsip visual kegiatan sekolah, praktikum KKA, Informatika, dan proyek laboratorium SMAN 1 Teluk Kuantan.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kegiatan, mapel, atau pengunggah..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
            />
          </div>
        </div>

        {/* Filter Bar Bulanan (Januari – Desember + Semua Bulan) */}
        <div className="space-y-3">
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1.5"
            role="tablist"
            aria-label="Filter dokumentasi berdasarkan bulan"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedBulan === 'Semua Bulan'}
              onClick={() => setSelectedBulan('Semua Bulan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedBulan === 'Semua Bulan'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              Semua Bulan{' '}
              <span
                className={`ml-1 font-mono tabular-nums ${
                  selectedBulan === 'Semua Bulan' ? 'text-sky-300' : 'text-slate-400'
                }`}
              >
                ({dokumentasi.length})
              </span>
            </button>

            {BULAN_INDONESIA.map((bulan) => {
              const count = monthCounts[bulan] || 0;
              const isActive = selectedBulan === bulan;
              return (
                <button
                  key={bulan}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedBulan(bulan)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {bulan}
                  {count > 0 && (
                    <span
                      className={`ml-1 font-mono tabular-nums ${
                        isActive ? 'text-sky-100' : 'text-slate-400'
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter Bar Kategori / Mata Pelajaran */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['Semua', ...KATEGORI_DOKUMENTASI] as const).map((kat) => {
              const isActive = selectedKategori === kat;
              return (
                <button
                  key={kat}
                  type="button"
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-50 text-[#0284C7] border border-[#0284C7]/40 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {kat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Galeri Dokumentasi */}
        {filteredDokumentasi.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              Belum Ada Dokumentasi pada Filter Ini
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Ubah pilihan bulan atau mata pelajaran, atau unggah foto kegiatan baru untuk melengkapi arsip.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBulan('Semua Bulan');
                  setSelectedKategori('Semua');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Reset Filter
              </button>
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => onOpenUpload()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Dokumentasi
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDokumentasi.map((item) => {
              const editable = canEditDok(item);

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group flex flex-col rounded-2xl bg-white border border-slate-200 overflow-hidden hover:border-sky-300 transition-colors"
                >
                  {/* Foto Klik untuk Lightbox */}
                  <button
                    type="button"
                    onClick={() => setLightboxItem(item)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
                  >
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.judul}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>

                  <div className="flex-1 flex flex-col p-5">
                    {/* Metadata Unboxed: Kategori · Bulan / Tanggal */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#0284C7] truncate">
                        {item.kategori}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] whitespace-nowrap shrink-0">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateId(item.tanggal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="mt-2 text-left text-base font-bold text-[#0F172A] leading-snug hover:text-[#0284C7] transition-colors"
                    >
                      {item.judul}
                    </button>

                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {item.deskripsi}
                    </p>

                    {/* Footer Kartu: Pengunggah & Aksi Edit/Hapus sesuai Peran */}
                    <div className="mt-auto pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700">
                          {item.uploaderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {item.uploaderRole === 'admin' ? 'Admin' : 'Guru'}
                        </span>
                      </div>

                      {editable && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenUpload(item)}
                            title="Edit dokumentasi"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDokTarget(item)}
                            title="Hapus dokumentasi"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Preview Modal */}
      <AnimatePresence>
        {lightboxItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxItem.judul}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxItem(null)}
              className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white overflow-hidden shadow-2xl border border-white/20"
            >
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                aria-label="Tutup pratinjau"
                className="absolute right-4 top-4 z-20 inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0F172A]/70 text-white hover:bg-[#0F172A] backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="bg-slate-950 flex items-center justify-center max-h-[55vh] overflow-hidden">
                <ImageWithFallback
                  src={lightboxItem.imageUrl}
                  alt={lightboxItem.judul}
                  className="w-full h-full max-h-[55vh] object-contain"
                />
              </div>

              <div className="p-6 overflow-y-auto space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#0284C7]">{lightboxItem.kategori}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateId(lightboxItem.tanggal)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Diunggah oleh {lightboxItem.uploaderName} (
                    {lightboxItem.uploaderRole === 'admin' ? 'Admin' : 'Guru'})
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] leading-snug">
                  {lightboxItem.judul}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {lightboxItem.deskripsi}
                </p>

                {canEditDok(lightboxItem) && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const target = lightboxItem;
                        setLightboxItem(null);
                        onOpenUpload(target);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Dokumentasi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = lightboxItem;
                        setLightboxItem(null);
                        setDeleteDokTarget(target);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Tambah / Edit Berita Media (Khusus Admin) */}
      <Modal
        isOpen={newsModalOpen}
        onClose={() => setNewsModalOpen(false)}
        title={editingNews ? 'Edit Tautan Berita Media' : 'Tambah Berita & Liputan Media'}
        subtitle="Tautkan artikel koran online terkait prestasi sekolah atau literasi digital."
      >
        <form onSubmit={handleNewsSubmit} className="space-y-4">
          <div>
            <label htmlFor="news-judul" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Judul Berita
            </label>
            <input
              id="news-judul"
              type="text"
              value={newsJudul}
              onChange={(e) => setNewsJudul(e.target.value)}
              placeholder="Contoh: SMAN 1 Teluk Kuantan Luncurkan Portal Lab Digital"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="news-sumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Sumber Media Online
              </label>
              <input
                id="news-sumber"
                type="text"
                value={newsSumber}
                onChange={(e) => setNewsSumber(e.target.value)}
                placeholder="Kompas.com / Riau Pos / Antara News"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="news-tgl" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tanggal Terbit
              </label>
              <input
                id="news-tgl"
                type="text"
                value={newsTanggal}
                onChange={(e) => setNewsTanggal(e.target.value)}
                placeholder="18 Nov 2026"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="news-url" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tautan URL Berita
            </label>
            <input
              id="news-url"
              type="url"
              value={newsUrl}
              onChange={(e) => setNewsUrl(e.target.value)}
              placeholder="https://riaupos.jawapos.com/..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="news-thumb" className="block text-sm font-semibold text-slate-700 mb-1.5">
              URL Gambar Thumbnail (Opsional)
            </label>
            <input
              id="news-thumb"
              type="text"
              value={newsThumb}
              onChange={(e) => setNewsThumb(e.target.value)}
              placeholder="/src/assets/images/berita_prestasi_sman1_1795043211512.jpg"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="news-ringkasan" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ringkasan Singkat
            </label>
            <textarea
              id="news-ringkasan"
              rows={2}
              value={newsRingkasan}
              onChange={(e) => setNewsRingkasan(e.target.value)}
              placeholder="Ringkasan singkat isi berita..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none resize-none"
            />
          </div>

          {newsError && <p className="text-xs font-medium text-red-600">{newsError}</p>}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700"
            >
              {editingNews ? 'Simpan Berita' : 'Tambahkan Berita'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Postingan Instagram */}
      <Modal
        isOpen={igModalOpen}
        onClose={() => setIgModalOpen(false)}
        title={editingIg ? 'Edit Postingan Instagram' : 'Tambah Postingan Instagram'}
        subtitle="Tampilkan tautan postingan resmi Instagram beserta foto pratinjaunya di halaman depan."
      >
        <form onSubmit={handleIgSubmit} className="space-y-4">
          <div>
            <label htmlFor="ig-url" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tautan Postingan Instagram
            </label>
            <input
              id="ig-url"
              type="url"
              value={igPostUrl}
              onChange={(e) => setIgPostUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Wajib menggunakan tautan resmi dari domain <code className="font-mono">instagram.com</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ig-akun" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Akun Instagram
              </label>
              <input
                id="ig-akun"
                type="text"
                value={igAkun}
                onChange={(e) => setIgAkun(e.target.value)}
                placeholder="@smansatekun.official"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ig-tgl" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tanggal Postingan
              </label>
              <input
                id="ig-tgl"
                type="text"
                value={igTanggal}
                onChange={(e) => setIgTanggal(e.target.value)}
                placeholder="18 Nov 2026"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ig-judul" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Judul / Caption Singkat
            </label>
            <textarea
              id="ig-judul"
              rows={2}
              value={igJudul}
              onChange={(e) => setIgJudul(e.target.value)}
              placeholder="Contoh: Kegiatan Praktikum KKA & Robotika SMAN 1 Teluk Kuantan"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700">Gambar Pratinjau Postingan</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIgImgMode('upload')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    igImgMode === 'upload'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Unggah Foto
                </button>
                <button
                  type="button"
                  onClick={() => setIgImgMode('url')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    igImgMode === 'url'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL Gambar
                </button>
              </div>
            </div>

            {igImgMode === 'upload' ? (
              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center cursor-pointer hover:border-[#0284C7] hover:bg-sky-50/40 transition-colors">
                <ImagePlus className="w-5 h-5 text-[#0284C7] mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  Pilih gambar pratinjau postingan (JPG / PNG / WebP)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Otomatis dikompresi agar ringan di database cloud
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleIgImageFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <input
                type="text"
                value={igImageUrl}
                onChange={(e) => setIgImageUrl(e.target.value)}
                placeholder="https://... atau /src/assets/images/..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            )}

            {igImageUrl && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <ImageWithFallback
                  src={igImageUrl}
                  alt="Pratinjau Instagram"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {igError && <p className="text-xs font-medium text-red-600">{igError}</p>}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIgModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0284C7] rounded-xl hover:bg-sky-700"
            >
              {editingIg ? 'Simpan Postingan' : 'Tambahkan ke Beranda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Konfirmasi Hapus Dokumentasi */}
      <ConfirmDialog
        isOpen={Boolean(deleteDokTarget)}
        onClose={() => setDeleteDokTarget(null)}
        onConfirm={() => {
          if (deleteDokTarget) onDeleteDokumentasi(deleteDokTarget.id);
        }}
        title="Hapus Dokumentasi Kegiatan"
        description={
          deleteDokTarget
            ? `Apakah Anda yakin ingin menghapus dokumentasi "${deleteDokTarget.judul}"?`
            : ''
        }
      />

      {/* Konfirmasi Hapus Berita */}
      <ConfirmDialog
        isOpen={Boolean(deleteNewsTarget)}
        onClose={() => setDeleteNewsTarget(null)}
        onConfirm={() => {
          if (deleteNewsTarget) onDeleteBerita(deleteNewsTarget.id);
        }}
        title="Hapus Tautan Berita"
        description={
          deleteNewsTarget
            ? `Apakah Anda yakin ingin menghapus tautan berita "${deleteNewsTarget.judul}"?`
            : ''
        }
      />

      {/* Konfirmasi Hapus Postingan Instagram */}
      <ConfirmDialog
        isOpen={Boolean(deleteIgTarget)}
        onClose={() => setDeleteIgTarget(null)}
        onConfirm={() => {
          if (deleteIgTarget) onDeleteInstagram(deleteIgTarget.id);
        }}
        title="Hapus Postingan Instagram"
        description={
          deleteIgTarget
            ? `Apakah Anda yakin ingin menghapus postingan Instagram "${deleteIgTarget.judul}"?`
            : ''
        }
      />
    </div>
  );
}
