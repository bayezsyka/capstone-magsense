import React, { useState, useRef, useEffect } from 'react';
import { Camera, PlayCircle, Bug } from 'lucide-react';

export default function Growth() {
  const [selectedCamera, setSelectedCamera] = useState('Ruang 2');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  
  const videoRef = useRef(null);
  const pcRef = useRef(null);

  const detectionData = {
    time: "10:00 WIB",
    babyLarva: 12,
    adultLarva: 45,
    prepupa: 10,
    pupa: 0,
    dominant: "ADULT LARVA"
  };

  const startStream = async () => {
    setIsStreaming(true);
    setStreamError(null);
    
    // Inisialisasi koneksi WebRTC
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    // Mendengarkan aliran video
    pc.ontrack = (event) => {
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Agar server merespons dengan video, setidaknya satu transciever harus berjenis recvonly (atau kita sendrecv)
    pc.addTransceiver('video', { direction: 'recvonly' });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Kirim SDP Offer ke Signaling Server (Edge Pi)
      const response = await fetch('http://localhost:8080/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi WebRTC Server');
      }

      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

    } catch (err) {
      console.error('WebRTC Error:', err);
      setStreamError(err.message);
      stopStream();
    }
  };

  const stopStream = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    // Cleanup saat komponen dibongkar
    return () => stopStream();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex items-center gap-3 mb-6">
        <select
          className="px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-white/50 rounded-xl outline-none font-bold text-slate-700 shadow-sm text-sm cursor-pointer transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-mag-green"
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
        >
          <option>Ruang 1</option>
          <option>Ruang 2</option>
          <option>Ruang 3</option>
        </select>
        <button
          onClick={isStreaming ? stopStream : startStream}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-sm hover:shadow-md text-sm hover:-translate-y-0.5 ${isStreaming
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
              : 'bg-gradient-to-r from-mag-green to-emerald-400 text-white shadow-glow hover:shadow-lg'
            }`}
        >
          <PlayCircle size={18} />
          {isStreaming ? 'Hentikan Stream' : 'Buka Live Stream'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIDEO PLAYER */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl aspect-video flex flex-col items-center justify-center text-slate-500 shadow-soft overflow-hidden relative border border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover absolute inset-0 z-10 ${!isStreaming || streamError ? 'hidden' : 'block'}`}
          />
          
          {(!isStreaming || streamError) && (
            <div className="flex flex-col items-center z-0">
              <Camera size={48} className={`mb-4 ${streamError ? 'text-red-500' : 'opacity-50'}`} />
              <p className={`text-sm font-medium ${streamError ? 'text-red-400' : ''}`}>
                {streamError ? `Error: ${streamError}` : 'Live stream tidak aktif'}
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR METRICS */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <h3 className="text-base font-black text-slate-800 mb-1">Hasil Deteksi Terakhir</h3>
          <p className="text-xs text-slate-400 font-medium mb-6 pb-4 border-b border-slate-100">Diperbarui: {detectionData.time}</p>

          <div className="space-y-0 flex-1">
            
            <div className="flex justify-between items-center py-4 border-b border-slate-50">
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

          <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50 to-green-100/50 rounded-2xl border border-emerald-100/50 text-center shadow-inner">
            <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">Fase Dominan</p>
            <p className="text-2xl font-black text-slate-800">{detectionData.dominant}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
