import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  ShieldCheck,
  GraduationCap,
  Globe,
  LogOut,
  AlertCircle,
  Cpu,
  Database,
  Loader2,
} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { AuthUser } from '../types/smansatekun';

export const GUEST_USER: AuthUser = {
  id: 'guest',
  username: 'pengunjung',
  namaLengkap: 'Pengunjung',
  jabatan: 'Akses Publik',
  role: 'guest',
  loginAt: '-',
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  firebaseEmail?: string | null;
  authReady: boolean;
  contextHint?: string;
  onSignedIn?: () => void;
  onSignedOut?: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  currentUser,
  firebaseEmail,
  authReady,
  contextHint,
  onSignedIn,
  onSignedOut,
}: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSignedIn?.();
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Jendela masuk Google ditutup sebelum proses selesai.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Browser memblokir popup masuk Google. Izinkan popup lalu coba kembali.');
      } else {
        setErrorMsg('Gagal masuk dengan akun Google. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await signOut(auth);
      onSignedOut?.();
      onClose();
    } catch {
      setErrorMsg('Gagal keluar dari sesi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGuest = currentUser.role === 'guest';
  const isAdmin = currentUser.role === 'admin';
  const isUnapprovedGoogleUser = isGuest && Boolean(firebaseEmail);

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
            className="relative z-10 w-full max-w-[430px] rounded-3xl border border-white/25 bg-white/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.35)] overflow-hidden"
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
                    Autentikasi Firebase untuk pengelolaan data cloud
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {contextHint && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900 leading-relaxed">
                  {contextHint}
                </div>
              )}

              {/* Status Akun Saat Ini */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isGuest
                        ? 'bg-slate-200/80 text-slate-600'
                        : 'bg-sky-100 text-[#0284C7]'
                    }`}
                  >
                    {isGuest ? (
                      <Globe className="w-5 h-5" />
                    ) : isAdmin ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {currentUser.namaLengkap}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {isGuest
                        ? 'Mode Pengunjung · Akses baca publik'
                        : `${isAdmin ? 'Admin' : 'Guru'} · ${currentUser.username}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pemberitahuan Keamanan jika Akun Google Belum Terdaftar di Whitelist */}
              {isUnapprovedGoogleUser && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Akun Google <strong>{firebaseEmail}</strong> belum terdaftar pada daftar Guru
                    SMANSATEKUN. Hubungi Admin untuk mengaktifkan izin pengelolaan data melalui
                    menu <strong>Keamanan &amp; Guru</strong>.
                  </span>
                </div>
              )}

              {/* Informasi Sinkronisasi Database */}
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
                <Database className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                <span>
                  {isGuest
                    ? 'Masuk menggunakan akun Google Admin atau Guru terdaftar untuk mengunggah dokumentasi dan mengelola data laboratorium di Firebase Firestore.'
                    : 'Sesi Anda terhubung ke Firebase Firestore. Setiap perubahan data tersimpan otomatis di cloud.'}
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tombol Aksi Auth */}
              {isGuest && !isUnapprovedGoogleUser ? (
                <button
                  type="button"
                  disabled={isLoading || !authReady}
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0284C7] disabled:opacity-60 transition-colors shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menghubungkan ke Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#EA4335"
                          d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
                        />
                      </svg>
                      Masuk dengan Google
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                  >
                    Ganti Akun Google
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleLogout}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
