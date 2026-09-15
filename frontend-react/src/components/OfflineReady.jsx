import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Wifi, RefreshCw, X } from 'lucide-react';

export default function OfflineReady() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 max-w-sm flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${needRefresh ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-mag-green'}`}>
              {needRefresh ? <RefreshCw size={20} /> : <Wifi size={20} />}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                {needRefresh ? 'Update Tersedia' : 'Aplikasi Siap Offline'}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {needRefresh 
                  ? 'Versi terbaru dari MagSense telah tersedia. Muat ulang untuk memperbarui.'
                  : 'Aplikasi kini dapat diakses tanpa koneksi internet.'}
              </p>
            </div>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {needRefresh && (
          <button 
            onClick={() => updateServiceWorker(true)}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-xl shadow-glow transition-all"
          >
            Muat Ulang Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
