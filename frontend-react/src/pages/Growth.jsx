import React, { useState, useEffect, useRef } from 'react';
import { Camera, PlayCircle, Bug } from 'lucide-react';
import { io } from 'socket.io-client';

const AI_BACKEND_IP = import.meta.env.VITE_AI_IP || "localhost"; // Use env var or default to localhost

export default function Growth() {
  const [selectedCamera, setSelectedCamera] = useState('Ruang 2');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiVideo, setAiVideo] = useState(null);

  const prevBlobUrlRef = useRef(null);

  const [detectionData, setDetectionData] = useState({
    time: "--:-- WIB",
    babyLarva: 0,
    adultLarva: 0,
    prepupa: 0,
    pupa: 0,
    dominant: "-"
  });

  const socket = useRef(null);

  const revokePrevBlobUrl = () => {
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (isStreaming) {
      socket.current = io(`http://${AI_BACKEND_IP}:5002`, {
        transports: ['websocket', 'polling']
      });

      socket.current.on("detection-data", (data) => {
        setDetectionData(data);
      });

      socket.current.on("video-frame-bytes", (arrayBuffer) => {
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        const newUrl = URL.createObjectURL(blob);
        revokePrevBlobUrl();
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
                : 'bg-mag-green text-white hover:bg-green-600'
              }`}
          >
            <PlayCircle size={18} />
            {isStreaming ? 'Hentikan Stream' : 'Buka Live Stream'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="w-8 h-8 border-4 border-mag-green border-t-transparent rounded-full animate-spin" />
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
                <Bug size={16} className="text-mag-green" /> Adult Larva
              </span>
              <span className="font-bold text-mag-green">{detectionData.adultLarva} Objek</span>
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

          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 text-center">
            <p className="text-xs text-mag-green mb-1 font-semibold uppercase tracking-wider">Fase Dominan</p>
            <p className="text-xl font-black text-green-800">{detectionData.dominant}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
