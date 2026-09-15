import React, { useState } from 'react';
import { Camera, PlayCircle, Bug } from 'lucide-react';

export default function Growth() {
  const [selectedCamera, setSelectedCamera] = useState('Ruang 2');
  const [isStreaming, setIsStreaming] = useState(false);

  const detectionData = {
    time: "10:00 WIB",
    babyLarva: 12,
    adultLarva: 45,
    prepupa: 10,
    pupa: 0,
    dominant: "ADULT LARVA"
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex items-center gap-3 mb-6">
        <select
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none font-bold text-gray-700 shadow-sm text-sm cursor-pointer"
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
        >
          <option>Ruang 1</option>
          <option>Ruang 2</option>
          <option>Ruang 3</option>
        </select>
        <button
          onClick={() => setIsStreaming(!isStreaming)}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition shadow-sm text-sm ${isStreaming
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-mag-green text-white hover:bg-green-600'
            }`}
        >
          <PlayCircle size={18} />
          {isStreaming ? 'Hentikan Stream' : 'Buka Live Stream'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIDEO PLAYER */}
        <div className="lg:col-span-2 bg-[#0b0f19] rounded-2xl aspect-video flex flex-col items-center justify-center text-gray-500 border border-gray-800 shadow-xl overflow-hidden relative">
          <div className="flex flex-col items-center">
            <Camera size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Live stream tidak aktif</p>
          </div>
        </div>

        {/* SIDEBAR METRICS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-black text-gray-800 mb-1">Hasil Deteksi Terakhir</h3>
          <p className="text-xs text-gray-400 font-medium mb-6 pb-4 border-b border-gray-100">Diperbarui: {detectionData.time}</p>

          <div className="space-y-0 flex-1">
            
            <div className="flex justify-between items-center py-4 border-b border-gray-50">
              <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <Bug size={16} /> Baby Larva
              </span>
              <span className="font-bold text-gray-800 text-sm">{detectionData.babyLarva} Objek</span>
            </div>

            <div className="flex justify-between items-center py-4 border-b border-gray-50">
              <span className="flex items-center gap-2 text-mag-green text-sm font-medium">
                <Bug size={16} /> Adult Larva
              </span>
              <span className="font-bold text-mag-green text-sm">{detectionData.adultLarva} Objek</span>
            </div>

            <div className="flex justify-between items-center py-4 border-b border-gray-50">
              <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <Bug size={16} /> Prepupa
              </span>
              <span className="font-bold text-gray-800 text-sm">{detectionData.prepupa} Objek</span>
            </div>

            <div className="flex justify-between items-center py-4">
              <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <Bug size={16} /> Pupa
              </span>
              <span className="font-bold text-gray-800 text-sm">{detectionData.pupa} Objek</span>
            </div>

          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 text-center">
            <p className="text-[10px] font-bold text-mag-green uppercase tracking-wider mb-1">Fase Dominan</p>
            <p className="text-xl font-black text-green-900">{detectionData.dominant}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
