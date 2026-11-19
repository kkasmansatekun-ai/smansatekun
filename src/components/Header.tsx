import React from 'react';
import { Menu, Lock, ShieldCheck, GraduationCap } from 'lucide-react';
import { AuthUser, MenuKey } from '../types/smansatekun';
import { NAV_ITEMS } from './Sidebar';

interface HeaderProps {
  activeMenu: MenuKey;
  user: AuthUser;
  onOpenMobileMenu: () => void;
  onOpenLoginModal: () => void;
  quickStats: {
    totalDokumentasi: number;
    totalPerangkat: number;
    totalMurid: number;
  };
}

export function Header({
  activeMenu,
  user,
  onOpenMobileMenu,
  onOpenLoginModal,
  quickStats,
}: HeaderProps) {
  const currentNav = NAV_ITEMS.find((n) => n.key === activeMenu) ?? NAV_ITEMS[0];

  const isGuest = user.role === 'guest';
  const isAdmin = user.role === 'admin';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Zona Kiri: Tombol Menu Mobile & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[#0284C7] whitespace-nowrap">SMANSATEKUN</span>
            {currentNav.parentLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-slate-600 whitespace-nowrap">
                  {currentNav.parentLabel}
                </span>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span className="truncate">{currentNav.shortLabel}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
            {currentNav.label}
          </h1>
        </div>
      </div>

      {/* Zona Tengah: Ringkasan Singkat Unboxed */}
      <div className="hidden xl:flex items-center gap-6 text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Dokumentasi:</span>
          <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
            {quickStats.totalDokumentasi} arsip
          </span>
        </div>
        <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Inventaris:</span>
          <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
            {quickStats.totalPerangkat} unit
          </span>
        </div>
        <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Murid:</span>
          <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
            {quickStats.totalMurid} siswa
          </span>
        </div>
      </div>

      {/* Zona Kanan: Identitas Sesi (jika login) & Ikon Tersembunyi / Diskret untuk Masuk */}
      <div className="flex items-center gap-3 shrink-0">
        {!isGuest && (
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[#0F172A] leading-tight max-w-[170px] truncate">
              {user.namaLengkap}
            </p>
            <p className="text-[11px] text-[#0284C7] font-medium">
              {isAdmin ? 'Admin Laboratorium' : 'Guru Pengampu'}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenLoginModal}
          title={
            isGuest
              ? 'Masuk sebagai Guru atau Admin'
              : `Akun aktif: ${user.namaLengkap} (Klik untuk ganti peran atau keluar)`
          }
          aria-label={isGuest ? 'Akses masuk pengguna' : 'Kelola sesi pengguna'}
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] ${
            isGuest
              ? 'border-transparent text-slate-400 hover:text-[#0284C7] hover:bg-slate-100'
              : 'border-sky-200 bg-sky-50 text-[#0284C7] hover:bg-sky-100'
          }`}
        >
          {isGuest ? (
            <Lock className="w-4 h-4" />
          ) : isAdmin ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <GraduationCap className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
