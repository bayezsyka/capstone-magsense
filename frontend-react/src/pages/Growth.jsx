import React, { useState, useRef, useEffect } from "react";
import { Camera, PlayCircle, Bug, ShieldAlert, Video } from "lucide-react";
import { getAllCvResults } from "../services/api";

export default function Growth() {
  const [selectedCamera, setSelectedCamera] = useState("Kamera Utama (Box 1)");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  
  const videoRef = useRef(null);
  const pcRef = useRef(null);

  const isLocalEnvironment = typeof window !== "undefined" && (
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1"
  );

  const [detectionData, setDetectionData] = useState({
    time: "-",
    babyLarva: 0,
    adultLarva: 0,
    prepupa: 0,
    pupa: 0,
    dominant: "-"
  });

  const fetchDetectionData = async () => {
    try {
      const data = await getAllCvResults();
      if (data && data.length > 0) {
        const latest = data[0]; 
        setDetectionData({
          time: new Date(latest.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB",
          babyLarva: latest.baby_larva || 0,
          adultLarva: latest.adult_larva || 0,
          prepupa: latest.prepupa || 0,
          pupa: latest.pupa || 0,
          dominant: latest.dominant_phase || "-"
        });
      }
    } catch (err) {
      console.warn("Gagal mengambil data CV dari backend:", err?.message || err);
    }
  };

  useEffect(() => {
    fetchDetectionData();
    const interval = setInterval(fetchDetectionData, 10000);
    return () => clearInterval(interval);
  }, []);

  const startStream = async () => {
    if (!isLocalEnvironment) {
      setStreamError("Kamera fisik dan live stream WebRTC hanya aktif di lingkungan lokal Edge Mac (127.0.0.1:8081) untuk alasan keamanan isolasi jaringan.");
      return;
    }

    setIsStreaming(true);
    setStreamError(null);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch("http://127.0.0.1:8081/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi WebRTC Server Lokal (127.0.0.1:8081)");
      }

      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

    } catch (err) {
      console.error("Local WebRTC Error:", err);
      setStreamError("Layanan WebRTC Edge belum aktif di 127.0.0.1:8081.");
      stopStream();
    }
  };

  const stopStream = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  const totalObjects = detectionData.babyLarva + detectionData.adultLarva + detectionData.prepupa + detectionData.pupa;

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-white/50 rounded-xl outline-none font-bold text-slate-700 shadow-sm text-sm cursor-pointer transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-mag-green"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            <option>Kamera Utama (Box 1)</option>
          </select>
          
          {isLocalEnvironment ? (
            <button
              onClick={isStreaming ? stopStream : startStream}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-sm hover:shadow-md text-sm hover:-translate-y-0.5 ${isStreaming
                  ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                  : "bg-gradient-to-r from-mag-green to-emerald-400 text-white shadow-glow hover:shadow-lg"
                }`}
            >
              <PlayCircle size={18} />
              {isStreaming ? "Hentikan Siaran" : "Buka Siaran Langsung Edge"}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold">
              <Video size={16} className="text-slate-400" />
              <span>Live Stream Kamera: Mode Edge Lokal</span>
            </div>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
          Environment: <span className={isLocalEnvironment ? "text-mag-green font-black" : "text-blue-600 font-black"}>{isLocalEnvironment ? "LOCAL DEV (Mac)" : "PUBLIC PRODUCTION"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIDEO PLAYER */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl aspect-video flex flex-col items-center justify-center text-slate-500 shadow-soft overflow-hidden relative border border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover absolute inset-0 z-10 ${!isStreaming || streamError ? "hidden" : "block"}`}
          />
          
          {(!isStreaming || streamError) && (
            <div className="flex flex-col items-center text-center p-6 z-0 max-w-md">
              <Camera size={44} className={`mb-3 ${streamError ? "text-red-400" : "text-slate-600"}`} />
              <p className="text-sm font-bold text-slate-300 mb-1">
                {isLocalEnvironment 
                  ? (streamError ? streamError : "Siaran Langsung Kamera Belum Aktif")
                  : "Live Stream Kamera Diisolasi di Edge Mac"
                }
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isLocalEnvironment
                  ? "Klik Buka Siaran Langsung Edge untuk menghubungkan WebRTC native ke kamera fisik Mac dan inferensi YOLOv8."
                  : "Untuk privasi dan keamanan infrastruktur, streaming kamera fisik hanya dibuka pada antarmuka lokal Mac (127.0.0.1:8081). Hasil deteksi numerik tetap disinkronkan secara aman ke Central API."
                }
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR METRICS */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <h3 className="text-base font-black text-slate-800 mb-4">Output Numerik CV</h3>

          <div className="space-y-3 border-b border-slate-100 pb-4 mb-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium tracking-wider">ID MGT</span>
              <span className="text-mag-green font-mono font-bold">MGT-001</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium tracking-wider">DIREKAM PADA</span>
              <span className="text-slate-700 font-bold">{detectionData.time}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium tracking-wider">SUMBER DATA</span>
              <span className="text-slate-700 font-bold">{isLocalEnvironment && isStreaming ? "Kamera Fisik Edge (127.0.0.1)" : "Central API (Sync SQLite)"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center shadow-inner">
              <span className="text-[10px] text-slate-500 font-bold mb-1 tracking-wider">TOTAL OBJEK</span>
              <span className="text-3xl font-black text-slate-800">{totalObjects}</span>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 rounded-2xl p-4 border border-emerald-100/50 flex flex-col justify-center shadow-inner">
              <span className="text-[10px] text-mag-green font-bold mb-1 tracking-wider uppercase">DOMINAN</span>
              <span className="text-xl font-black text-slate-800 capitalize">{detectionData.dominant.toLowerCase() === "-" ? "Tidak Ada" : detectionData.dominant}</span>
            </div>
          </div>

          <div className="mb-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
            <h4 className="text-mag-green text-xs font-bold mb-2 tracking-wider">REKOMENDASI</h4>
            <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 marker:text-mag-green font-medium">
              <li>Populasi didominasi {detectionData.dominant.toLowerCase() !== "-" ? detectionData.dominant.toLowerCase() : "fase belum diketahui"}.</li>
              <li>Pindahkan ke kandang reproduksi/perkawinan.</li>
              <li>Hentikan intervensi pakan sepenuhnya.</li>
              <li>Pantau untuk estimasi waktu kemunculan lalat dewasa demi siklus produksi berikutnya.</li>
            </ul>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "BAYI", value: detectionData.babyLarva },
              { label: "DEWASA", value: detectionData.adultLarva },
              { label: "PREPUPA", value: detectionData.prepupa },
              { label: "PUPA", value: detectionData.pupa }
            ].map((item) => {
              const percentage = totalObjects === 0 ? 0 : ((item.value / totalObjects) * 100).toFixed(0);
              return (
                <div key={item.label} className="bg-white rounded-xl p-2.5 flex flex-col items-center justify-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-[9px] text-slate-400 font-bold mb-1">{item.label}</span>
                  <span className="text-lg font-black text-slate-800">{item.value}</span>
                  <span className="text-[9px] text-mag-green font-bold mt-1">{percentage}%</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-4 mt-auto">
            <span className="text-slate-500 font-bold tracking-wider">RATA-RATA AKURASI</span>
            <span className="text-mag-green font-black">0.9</span>
          </div>
        </div>

      </div>
    </div>
  );
}
