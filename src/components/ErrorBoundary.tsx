import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Terjadi kesalahan saat memproses data.';
    let friendly = 'Terjadi gangguan saat berkomunikasi dengan database Firebase.';
    let isQuotaError = false;

    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      const detail = parsed.error || raw;
      if (detail.includes('Quota exceeded')) {
        isQuotaError = true;
        friendly =
          'Kuota harian pembacaan/penulisan Firebase Firestore telah tercapai. Kuota akan direset otomatis pada hari berikutnya.';
      } else if (detail.toLowerCase().includes('permission')) {
        friendly =
          'Akses ke database ditolak oleh aturan keamanan Firestore. Pastikan Anda telah masuk dengan akun Google yang memiliki izin sesuai.';
      } else {
        friendly = `Gagal memproses operasi database (${parsed.operationType ?? 'akses'}): ${detail}`;
      }
    } catch {
      if (raw.includes('Quota exceeded')) {
        isQuotaError = true;
        friendly =
          'Kuota harian Firebase Firestore telah tercapai. Silakan coba kembali besok atau tingkatkan paket Firebase Anda.';
      } else {
        friendly = raw;
      }
    }

    return {
      hasError: true,
      message: friendly,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '', isQuotaError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A]">Terjadi Gangguan Aplikasi</h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            </div>
            {this.state.isQuotaError && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold text-[#0284C7] hover:underline"
              >
                Buka Pengaturan Database di Firebase Console
              </a>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Muat Ulang Aplikasi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
