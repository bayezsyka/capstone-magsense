import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white/90 backdrop-blur-sm rounded-3xl border border-red-100 shadow-soft">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <AlertOctagon size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Terjadi Kesalahan!</h2>
          <p className="text-sm font-medium text-slate-500 max-w-md mb-8">
            Komponen ini mengalami gangguan saat memuat data. Anda bisa mencoba memuat ulang halaman atau menghubungi tim dukungan.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-400 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-glow hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <RefreshCw size={16} />
            Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
