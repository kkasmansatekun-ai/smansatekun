import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Pencil,
  Trash2,
  GitBranch,
  LayoutGrid,
  Users,
} from 'lucide-react';
import { JabatanItem, TingkatHirarki } from '../../types/smansatekun';
import { Modal, ConfirmDialog } from '../ui/Modal';

interface StrukturJabatanViewProps {
  items: JabatanItem[];
  isAdmin: boolean;
  onAdd: (item: Omit<JabatanItem, 'id'>) => void;
  onUpdate: (item: JabatanItem) => void;
  onDelete: (id: string) => void;
}

const TINGKAT_LIST: TingkatHirarki[] = [
  'Pimpinan',
  'Koordinator & Teknisi',
  'Asisten & Operasional',
];

function StaffAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(' ')
    .filter((w) => !w.includes('.'))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'ST';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto profil ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-indigo-900 text-white font-bold text-base flex items-center justify-center shrink-0 border border-slate-200">
      {initials}
    </div>
  );
}

export function StrukturJabatanView({
  items,
  isAdmin,
  onAdd,
  onUpdate,
  onDelete,
}: StrukturJabatanViewProps) {
  const [viewMode, setViewMode] = useState<'bagan' | 'grid'>('bagan');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JabatanItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JabatanItem | null>(null);

  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formTingkat, setFormTingkat] = useState<TingkatHirarki>('Koordinator & Teknisi');
  const [formTugasPokok, setFormTugasPokok] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setFormNama('');
    setFormNip('');
    setFormJabatan('');
    setFormTingkat('Koordinator & Teknisi');
    setFormTugasPokok('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: JabatanItem) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormNip(item.nip);
    setFormJabatan(item.jabatan);
    setFormTingkat(item.tingkat);
    setFormTugasPokok(item.tugasPokok);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNip.trim() || !formJabatan.trim() || !formTugasPokok.trim()) {
      setFormError('Semua kolom wajib diisi sebelum menyimpan data jabatan.');
      return;
    }

    if (editingItem) {
      onUpdate({
        ...editingItem,
        nama: formNama.trim(),
        nip: formNip.trim(),
        jabatan: formJabatan.trim(),
        tingkat: formTingkat,
        tugasPokok: formTugasPokok.trim(),
      });
    } else {
      onAdd({
        nama: formNama.trim(),
        nip: formNip.trim(),
        jabatan: formJabatan.trim(),
        tingkat: formTingkat,
        tugasPokok: formTugasPokok.trim(),
      });
    }

    setModalOpen(false);
  };

  const renderStaffCard = (item: JabatanItem, isLeader = false) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-2xl bg-white border ${
        isLeader ? 'border-sky-200 ring-1 ring-sky-100' : 'border-slate-200'
      } p-5 transition-colors hover:border-sky-300`}
    >
      <div className="flex items-start gap-4">
        <StaffAvatar name={item.nama} avatarUrl={item.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#0284C7]">{item.jabatan}</p>
          <h3 className="mt-0.5 text-base font-bold text-[#0F172A] leading-snug">
            {item.nama}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono tabular-nums">NIP {item.nip}</span>
            <span aria-hidden="true">·</span>
            <span>{item.tingkat}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 mb-1">Tugas Pokok</p>
        <p className="text-sm text-slate-600 leading-relaxed">{item.tugasPokok}</p>
      </div>

      {isAdmin && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openEditModal(item)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#0284C7] hover:border-sky-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(item)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Bagian Header Modul & Kontrol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Struktur Jabatan Labor Komputer
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Susunan pengelola, teknisi, dan asisten operasional laboratorium SMANSATEKUN ({items.length} personel aktif).
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('bagan')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'bagan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Bagan Hirarki
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Daftar Kartu
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Jabatan
            </button>
          )}
        </div>
      </div>

      {/* Keadaan Kosong */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">Belum Ada Data Jabatan</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Susunan kepala laboratorium, teknisi jaringan, dan asisten labor akan tampil di sini.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Jabatan Pertama
            </button>
          )}
        </div>
      ) : viewMode === 'bagan' ? (
        /* Tampilan Bagan Hirarki Berjenjang */
        <div className="space-y-8">
          {TINGKAT_LIST.map((tingkat, tierIndex) => {
            const tierItems = items.filter((item) => item.tingkat === tingkat);
            if (tierItems.length === 0) return null;

            const isTopTier = tingkat === 'Pimpinan';

            return (
              <section key={tingkat} className="relative">
                {tierIndex > 0 && (
                  <div
                    aria-hidden="true"
                    className="hidden md:flex justify-center -mt-4 mb-4"
                  >
                    <div className="w-px h-8 bg-slate-300" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">
                    {tierIndex + 1}. {tingkat}
                  </h3>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {tierItems.length} posisi
                  </span>
                </div>

                <div
                  className={
                    isTopTier && tierItems.length === 1
                      ? 'max-w-xl mx-auto'
                      : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                  }
                >
                  {tierItems.map((item) => renderStaffCard(item, isTopTier))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Tampilan Grid Seragam */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => renderStaffCard(item, item.tingkat === 'Pimpinan'))}
        </div>
      )}

      {/* Modal Tambah / Edit Jabatan */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Data Jabatan' : 'Tambah Jabatan Baru'}
        subtitle="Lengkapi profil personel pengelola laboratorium komputer SMANSATEKUN."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jab-nama" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nama Lengkap & Gelar
            </label>
            <input
              id="jab-nama"
              type="text"
              value={formNama}
              onChange={(e) => setFormNama(e.target.value)}
              placeholder="Contoh: Budi Santoso, S.Kom."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="jab-nip" className="block text-sm font-semibold text-slate-700 mb-1.5">
                NIP / Nomor Induk Pegawai
              </label>
              <input
                id="jab-nip"
                type="text"
                value={formNip}
                onChange={(e) => setFormNip(e.target.value)}
                placeholder="Contoh: 199005142019031005"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label htmlFor="jab-tingkat" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tingkat Hirarki
              </label>
              <select
                id="jab-tingkat"
                value={formTingkat}
                onChange={(e) => setFormTingkat(e.target.value as TingkatHirarki)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {TINGKAT_LIST.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="jab-title" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Jabatan
            </label>
            <input
              id="jab-title"
              type="text"
              value={formJabatan}
              onChange={(e) => setFormJabatan(e.target.value)}
              placeholder="Contoh: Teknisi Perangkat Keras & Jaringan"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label htmlFor="jab-tugas" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tugas Pokok
            </label>
            <textarea
              id="jab-tugas"
              rows={3}
              value={formTugasPokok}
              onChange={(e) => setFormTugasPokok(e.target.value)}
              placeholder="Uraikan tanggung jawab utama posisi ini di laboratorium..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-600">{formError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan Jabatan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
        }}
        title="Hapus Data Jabatan"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus "${deleteTarget.nama}" (${deleteTarget.jabatan}) dari struktur organisasi laboratorium?`
            : ''
        }
      />
    </div>
  );
}
