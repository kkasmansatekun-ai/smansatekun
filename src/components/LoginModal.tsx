import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Globe,
  LogOut,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { AuthUser, UserRole } from '../types/smansatekun';

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  guest: {
    id: 'guest',
    username: 'pengunjung',
    namaLengkap: 'Pengunjung',
    jabatan: 'Akses Publik',
    role: 'guest',
    loginAt: '-',
  },
  guru: {
    id: 'guru-nadia',
    username: '199111242018022003',
    namaLengkap: 'Nadia Kusuma Putri, S.Pd.',
    jabatan: 'Guru KKA & Koordinator Praktikum',
    role: 'guru',
    mataPelajaran: 'KKA',
    loginAt: '',
  },
  admin: {
    id: 'admin-hendra',
    username: '197904182005011008',
    namaLengkap: 'Drs. Hendra Wijaya, M.Kom.',
    jabatan: 'Kepala Laboratorium Komputer',
    role: 'admin',
    loginAt: '',
  },
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onSelectUser: (user: AuthUser) => void;
  contextHint?: string;
}

export function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  contextHint,
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleQuickRole = (role: UserRole) => {
    const template = DEMO_USERS[role];
    onSelectUser({
      ...template,
      loginAt: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setUsername('');
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('Harap isi Username / NIP dan Kata Sandi terlebih dahulu.');
      return;
    }

    const lower = u.toLowerCase();
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (lower === 'guru' || lower === '199111242018022003') {
      onSelectUser({ ...DEMO_USERS.guru, loginAt: nowTime });
    } else if (lower === 'admin' || lower === '197904182005011008') {
      onSelectUser({ ...DEMO_USERS.admin, loginAt: nowTime });
    } else {
      onSelectUser({
        id: `user-${lower}`,
        username: u,
        namaLengkap: u,
        jabatan: 'Pengelola Laboratorium',
        role: 'admin',
        loginAt: nowTime,
      });
    }

    setUsername('');
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0F172A]/65 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[440px] rounded-3xl border border-white/25 bg-white/90 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.35)] overflow-hidden"
          >
            {/* Header Modal */}
            <div className="relative px-6 pt-6 pb-5 bg-[#0F172A] text-white">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup jendela masuk"
                className="absolute right-4 top-4 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#0284C7] shadow-md shadow-sky-900/40 shrink-0">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 id="login-modal-title" className="text-lg font-bold tracking-tight">
                    Akses Pengguna SMANSATEKUN
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pilih peran atau masuk dengan NIP / Username Anda
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {contextHint && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900 leading-relaxed">
                  {contextHint}
                </div>
              )}

              {/* Ganti Peran Cepat (1-Klik Demo Switcher) */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2.5">
                  Akses Cepat Uji Coba Peran
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickRole('guest')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      currentUser.role === 'guest'
                        ? 'border-[#0284C7] bg-sky-50 text-[#0F172A] ring-1 ring-[#0284C7]/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-[#0284C7]" />
                    <span className="text-xs font-semibold">Pengunjung</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRole('guru')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      currentUser.role === 'guru'
                        ? 'border-[#0284C7] bg-sky-50 text-[#0F172A] ring-1 ring-[#0284C7]/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-[#0284C7]" />
                    <span className="text-xs font-semibold">Guru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRole('admin')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      currentUser.role === 'admin'
                        ? 'border-[#0284C7] bg-sky-50 text-[#0F172A] ring-1 ring-[#0284C7]/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                    <span className="text-xs font-semibold">Admin</span>
                  </button>
                </div>
              </div>

              {/* Status Login Aktif + Tombol Keluar */}
              {currentUser.role !== 'guest' && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">
                      {currentUser.namaLengkap}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Peran aktif: {currentUser.role === 'admin' ? 'Admin' : 'Guru'} · {currentUser.jabatan}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickRole('guest')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar
                  </button>
                </div>
              )}

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-3 text-[11px] font-medium text-slate-400">
                  atau masuk manual
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Form Login Manual */}
              <form onSubmit={handleManualSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="modal-login-user"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username / NIP
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="modal-login-user"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Masukkan NIP atau Username"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="modal-login-pass"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="modal-login-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Masukkan kata sandi"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0284C7] transition-colors"
                >
                  Masuk ke Sistem
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
