import { useState, useEffect, useRef } from 'react';
import { Camera, PlayCircle, Bug } from 'lucide-react';
import { io } from 'socket.io-client';

const BACKEND_IP = "192.168.18.148"; // ⚠️ GANTI DENGAN IP LAPTOPMU

export default function Growth() {
  const [selectedCamera, setSelectedCamera] = useState('Ruang 2');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiVideo, setAiVideo] = useState(null);

  // Ref untuk mengelola pembersihan Blob URL lama secara aman
  const prevBlobUrlRef = useRef(null);

  // Menghubungkan state ke data real-time dari Python AI
  const [detectionData, setDetectionData] = useState({
    time: "--:-- WIB",
    babyLarva: 0,
    adultLarva: 0,
    prepupa: 0,
    pupa: 0,
    dominant: "-"
  });

  const socket = useRef(null);

  // Fungsi utilitas untuk membersihkan memori Blob URL
  const revokePrevBlobUrl = () => {
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (isStreaming) {
      // 1. Konek ke Server Python AI (Port 5002) dengan koneksi WebSocket murni
      socket.current = io(`http://${BACKEND_IP}:5002`, {
        transports: ['websocket', 'polling']
      });

      // 2. Terima data statistik deteksi objek (JSON)
      socket.current.on("detection-data", (data) => {
        setDetectionData(data);
      });

      // 3. OPTIMALISASI STREAM: Menerima Frame berupa Binary ArrayBuffer/Bytes
      socket.current.on("video-frame-bytes", (arrayBuffer) => {
        // Buat Blob dari biner JPEG
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });

        // Buat URL memori langsung tanpa konversi Base64
        const newUrl = URL.createObjectURL(blob);

        // Bersihkan URL lama agar RAM browser tidak bocor
        revokePrevBlobUrl();

        // Simpan URL baru
        prevBlobUrlRef.current = newUrl;
        setAiVideo(newUrl);
      });

    } else {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      revokePrevBlobUrl();
      setAiVideo(null);
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      revokePrevBlobUrl();
    };
  }, [isStreaming]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            className="p-2 border rounded-lg bg-white outline-none font-medium text-slate-700 shadow-sm"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            <option>Ruang 2</option>
            <option>Ruang 3</option>
          </select>
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition shadow-sm ${isStreaming
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
          >
            <PlayCircle size={18} />
            {isStreaming ? 'Hentikan Stream' : 'Buka Live Stream'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Area */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl aspect-video flex flex-col items-center justify-center text-slate-500 border-4 border-slate-800 overflow-hidden relative shadow-xl">
          {isStreaming ? (
            aiVideo ? (
              <img
                src={aiVideo}
                alt="Live AI Stream 4K"
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="animate-pulse text-slate-400 text-sm">Menghubungkan ke Stream 4K AI...</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center">
              <Camera size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Live stream tidak aktif</p>
            </div>
          )}
        </div>

        {/* Detection Results */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-700 mb-2">Hasil Deteksi Terakhir</h3>
          <p className="text-sm text-slate-400 mb-6 border-b pb-4">Diperbarui: {detectionData.time}</p>

          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Bug size={16} className="text-slate-400" /> Baby Larva
              </span>
              <span className="font-bold text-slate-800">{detectionData.babyLarva} Objek</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Bug size={16} className="text-emerald-500" /> Adult Larva
              </span>
              <span className="font-bold text-emerald-600">{detectionData.adultLarva} Objek</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Bug size={16} className="text-amber-500" /> Prepupa
              </span>
              <span className="font-bold text-slate-800">{detectionData.prepupa} Objek</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Bug size={16} className="text-purple-500" /> Pupa
              </span>
              <span className="font-bold text-slate-800">{detectionData.pupa} Objek</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <p className="text-xs text-emerald-600 mb-1 font-semibold uppercase tracking-wider">Fase Dominan</p>
            <p className="text-xl font-black text-emerald-800">{detectionData.dominant}</p>
          </div>
        </div>
      </div>
    </div>
  );
}