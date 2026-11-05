import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Play,
  Square,
  Upload,
  Layers,
  Clock,
  Cpu,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { getAllCvResults, getAllBoxes, scanFrameCv } from "../services/api";

export default function Growth() {
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" (belakang) atau "user" (depan)
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoScanIntervalRef = useRef(null);

  // Status deteksi larva
  const [detectionData, setDetectionData] = useState({
    time: "-",
    babyLarva: 0,
    adultLarva: 0,
    prepupa: 0,
    pupa: 0,
    total: 0,
    dominant: "-",
    confidence: 0,
    inferenceMs: 0,
    source: "Belum Ada Pindaian"
  });

  // Status prediksi panen (XGBoost)
  const [harvestData, setHarvestData] = useState({
    estimatedDays: null,
    urgencyLevel: "-",
    confidence: null,
    sensorUsed: null
  });

  // Load boxes dan CV results awal
  useEffect(() => {
    const initData = async () => {
      try {
        const boxList = await getAllBoxes();
        if (boxList && boxList.length > 0) {
          setBoxes(boxList);
          setSelectedBoxId(boxList[0].id);
        }
      } catch (err) {
        console.warn("Gagal memuat daftar box:", err);
      }

      try {
        const cvList = await getAllCvResults();
        if (cvList && cvList.length > 0) {
          const latest = cvList[0];
          const counts = latest.detection_counts || {};
          const b = counts.baby_larva || latest.baby_larva || 0;
          const a = counts.adult_larva || latest.adult_larva || 0;
          const pr = counts.prepupa || latest.prepupa || 0;
          const pu = counts.pupa || latest.pupa || 0;
          const tot = b + a + pr + pu;

          setDetectionData({
            time: new Date(latest.timestamp).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            }) + " WIB",
            babyLarva: b,
            adultLarva: a,
            prepupa: pr,
            pupa: pu,
            total: tot,
            dominant: latest.dominant_phase || "-",
            confidence: latest.confidence_score ? Math.round(latest.confidence_score * 100) : 85,
            inferenceMs: 0,
            source: "Database Riwayat"
          });
        }
      } catch (err) {
        console.warn("Gagal memuat riwayat CV:", err);
      }
    };

    initData();
  }, []);

  // Nyalakan Kamera Device
  const startCamera = async () => {
    setCameraError(null);
    setScanMessage(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      setCameraError(
        "Tidak dapat mengakses kamera perangkat. Pastikan izin kamera aktif atau gunakan tombol Unggah Foto."
      );
      setIsCameraActive(false);
    }
  };

  // Matikan Kamera Device
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setAutoScanEnabled(false);
    clearBoundingBoxes();
  };

  // Bersihkan canvas bounding box
  const clearBoundingBoxes = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Gambar Bounding Boxes ke Canvas Overlay
  const drawBoundingBoxes = (boxes, origWidth, origHeight) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const displayW = video.clientWidth;
    const displayH = video.clientHeight;

    canvas.width = displayW;
    canvas.height = displayH;
    ctx.clearRect(0, 0, displayW, displayH);

    if (!boxes || boxes.length === 0) return;

    // Video dan overlay memakai object-cover. Hitung skala serta crop yang sama
    // agar koordinat box tetap menempel pada objek yang terlihat.
    const sourceW = origWidth || displayW;
    const sourceH = origHeight || displayH;
    const coverScale = Math.max(displayW / sourceW, displayH / sourceH);
    const renderedW = sourceW * coverScale;
    const renderedH = sourceH * coverScale;
    const cropX = (renderedW - displayW) / 2;
    const cropY = (renderedH - displayH) / 2;
    const toDisplayX = (value) => value * coverScale - cropX;
    const toDisplayY = (value) => value * coverScale - cropY;

    boxes.forEach((box) => {
      const x1 = toDisplayX(box.x1);
      const y1 = toDisplayY(box.y1);
      const w = (box.x2 - box.x1) * coverScale;
      const h = (box.y2 - box.y1) * coverScale;

      let color = "#06b6d4"; // Cyan default
      if (box.class_name.includes("Adult")) color = "#10b981"; // Hijau
      else if (box.class_name.includes("Prepupa")) color = "#f59e0b"; // Oranye
      else if (box.class_name.includes("Pupa")) color = "#8b5cf6"; // Ungu

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, w, h);

      // Label confidence ditampilkan sebagai desimal, misalnya 0.85.
      const label = `${box.class_name} ${(Number(box.confidence) || 0).toFixed(2)}`;
      ctx.font = "10px sans-serif";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(x1, Math.max(0, y1 - 16), textWidth + 6, 16);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x1 + 3, Math.max(12, y1 - 4));
    });
  };

  // Capture frame saat ini dari video dan lakukan inferensi
  const performScan = useCallback(async () => {
    if (!videoRef.current || isScanning) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    setIsScanning(true);
    setScanMessage("Memproses inferensi model di Proxmox CT 600...");

    try {
      // Kirim resolusi asli kamera agar detail objek kecil tidak hilang sebelum inference.
      const captureCanvas = document.createElement("canvas");
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;

      captureCanvas.width = w;
      captureCanvas.height = h;
      const ctx = captureCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      const base64Data = captureCanvas.toDataURL("image/jpeg", 0.90);

      const result = await scanFrameCv({
        image: base64Data,
        box_id: selectedBoxId || undefined
      });

      if (result && result.success) {
        const counts = result.detection_counts || {};
        const b = counts.baby_larva || 0;
        const a = counts.adult_larva || 0;
        const pr = counts.prepupa || 0;
        const pu = counts.pupa || 0;
        const tot = counts.total_detected || b + a + pr + pu;

        setDetectionData({
          time: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }) + " WIB",
          babyLarva: b,
          adultLarva: a,
          prepupa: pr,
          pupa: pu,
          total: tot,
          dominant: result.dominant_phase || "-",
          confidence: Number(result.confidence_score || 0.85),
          inferenceMs: result.inference_ms || 0,
          source: "Kamera Device (Live Proxmox)"
        });

        if (result.harvest_prediction) {
          setHarvestData({
            estimatedDays: result.harvest_prediction.estimated_days,
            urgencyLevel: result.harvest_prediction.urgency_level,
            confidence: result.harvest_prediction.confidence,
            sensorUsed: result.sensor_used
          });
        }

        drawBoundingBoxes(result.boxes, w, h);
        setScanMessage(`Pindaian selesai (${result.inference_ms} ms) — ${tot} larva terdeteksi.`);
      }
    } catch (err) {
      console.error("Gagal melakukan scan frame:", err);
      setScanMessage("Gagal memproses frame: " + (err.error || err.message || "Koneksi terputus"));
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, selectedBoxId]);

  // Handler Unggah Foto Manual
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanMessage("Mengunggah dan menganalisis foto larva...");
    clearBoundingBoxes();

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;
        const result = await scanFrameCv({
          image: base64Data,
          box_id: selectedBoxId || undefined
        });

        if (result && result.success) {
          const counts = result.detection_counts || {};
          const b = counts.baby_larva || 0;
          const a = counts.adult_larva || 0;
          const pr = counts.prepupa || 0;
          const pu = counts.pupa || 0;
          const tot = counts.total_detected || b + a + pr + pu;

          setDetectionData({
            time: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            }) + " WIB",
            babyLarva: b,
            adultLarva: a,
            prepupa: pr,
            pupa: pu,
            total: tot,
            dominant: result.dominant_phase || "-",
            confidence: Number(result.confidence_score || 0.85),
            inferenceMs: result.inference_ms || 0,
            source: "Unggahan File Foto"
          });

          if (result.harvest_prediction) {
            setHarvestData({
              estimatedDays: result.harvest_prediction.estimated_days,
              urgencyLevel: result.harvest_prediction.urgency_level,
              confidence: result.harvest_prediction.confidence,
              sensorUsed: result.sensor_used
            });
          }

          setScanMessage(`Analisis foto selesai (${result.inference_ms} ms) — ${tot} larva terdeteksi.`);
        }
      } catch (err) {
        console.error("Gagal memproses berkas foto:", err);
        setScanMessage("Gagal memproses berkas foto: " + (err.error || err.message));
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle Auto-Scan tiap 2.5 detik
  useEffect(() => {
    if (autoScanEnabled && isCameraActive) {
      autoScanIntervalRef.current = setInterval(() => {
        performScan();
      }, 2500);
    } else {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    }
    return () => {
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
      }
    };
  }, [autoScanEnabled, isCameraActive, performScan]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ganti kamera depan / belakang
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: nextMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error("Gagal beralih kamera:", e);
      }
    }
  };

  const totalObjects = detectionData.total;

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilih Box */}
          <select
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 shadow-sm text-sm cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-[#0c253b]"
            value={selectedBoxId}
            onChange={(e) => setSelectedBoxId(e.target.value)}
          >
            {boxes.length > 0 ? (
              boxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || `Box ${b.id.slice(0, 8)}`}
                </option>
              ))
            ) : (
              <option value="">Box Utama (Kandang MGT)</option>
            )}
          </select>

          {/* Tombol Kamera Utama */}
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm shadow-sm ${isCameraActive
              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              : "bg-[#0c253b] text-white hover:bg-[#081a2a]"
              }`}
          >
            {isCameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
            {isCameraActive ? "Tutup Kamera" : "Buka Kamera Device"}
          </button>

          {/* Beralih Kamera Depan/Belakang jika aktif */}
          {isCameraActive && (
            <button
              onClick={toggleCameraFacing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50"
              title="Ganti Kamera Depan / Belakang"
            >
              <RefreshCw size={14} />
              <span>{facingMode === "environment" ? "Kamera Belakang" : "Kamera Depan"}</span>
            </button>
          )}

          {/* Tombol Pindai Frame */}
          {isCameraActive && (
            <button
              onClick={performScan}
              disabled={isScanning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm text-white shadow-sm ${isScanning
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-[#97ad82] hover:bg-[#869b71]"
                }`}
            >
              <Play size={16} />
              {isScanning ? "Memindai..." : "Pindai Frame"}
            </button>
          )}

          {/* Mode Auto Scan Toggle */}
          {isCameraActive && (
            <button
              onClick={() => setAutoScanEnabled(!autoScanEnabled)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${autoScanEnabled
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
            >
              <Sparkles size={14} className={autoScanEnabled ? "text-emerald-600 animate-pulse" : ""} />
              <span>{autoScanEnabled ? "Auto-Pindai Aktif (2.5s)" : "Auto-Pindai"}</span>
            </button>
          )}

          {/* Upload File Alternatif */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
          >
            <Upload size={14} />
            <span>Unggah Foto</span>
          </button>
        </div>

        {/* Server & Environment Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
          <Cpu size={14} className="text-[#0c253b]" />
          <span>Inferensi: Proxmox CT 600 (YOLOv8 + XGBoost)</span>
        </div>
      </div>

      {/* Pesan status pemrosesan */}
      {scanMessage && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Grid Utama: Video Viewport & Metrik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: VIEWPORT KAMERA */}
        <div className="lg:col-span-2 bg-[#081a2a] rounded-2xl aspect-video flex flex-col items-center justify-center text-slate-400 overflow-hidden relative border border-slate-800 shadow-sm">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover absolute inset-0 z-10 ${isCameraActive ? "block" : "hidden"
              }`}
          />

          {/* Canvas Overlay Bounding Boxes */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover absolute inset-0 z-20 pointer-events-none ${isCameraActive ? "block" : "hidden"
              }`}
          />

          {/* Overlay Status Scanning */}
          {isScanning && (
            <div className="absolute top-4 right-4 z-30 bg-[#0c253b]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-white/20">
              <RefreshCw size={13} className="animate-spin text-[#97ad82]" />
              <span>Memindai AI...</span>
            </div>
          )}

          {/* Placeholder saat kamera non-aktif */}
          {!isCameraActive && (
            <div className="flex flex-col items-center text-center p-8 z-0 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-4 text-slate-300">
                <Camera size={32} />
              </div>
              <p className="text-base font-bold text-slate-200 mb-1">
                Kamera Device Siap Diakses
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Klik tombol <strong className="text-white">Buka Kamera Device</strong> di atas untuk memindai larva langsung via kamera HP/Laptop, atau gunakan tombol <strong className="text-white">Unggah Foto</strong>.
              </p>
              {cameraError && (
                <div className="flex items-center gap-2 text-rose-300 bg-rose-950/40 border border-rose-800/60 px-3.5 py-2 rounded-xl text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: PANEL METRIK HASIL ANALISIS */}
        <div className="space-y-6">
          {/* Card Deteksi Siklus Hidup */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#0c253b]" />
                <h3 className="text-sm font-black text-[#081a2a]">Output Computer Vision</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {detectionData.time}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Terdeteksi
                </span>
                <span className="text-2xl font-black text-[#081a2a]">{totalObjects}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Larva terhitung</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Fase Dominan
                </span>
                <span className="text-base font-black text-[#0c253b] block truncate">
                  {detectionData.dominant === "-" ? "Belum Ada" : detectionData.dominant}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  Akurasi: {(Number(detectionData.confidence) * 100).toFixed(2).replace(".", ",")}%
                </span>
              </div>
            </div>

            {/* Cacah 4 Fase */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: "Baby Larva", val: detectionData.babyLarva, border: "border-cyan-200", bg: "bg-cyan-50/50" },
                { label: "Adult Larva", val: detectionData.adultLarva, border: "border-emerald-200", bg: "bg-emerald-50/50" },
                { label: "Prepupa", val: detectionData.prepupa, border: "border-amber-200", bg: "bg-amber-50/50" },
                { label: "Pupa", val: detectionData.pupa, border: "border-purple-200", bg: "bg-purple-50/50" }
              ].map((item) => {
                const pct = totalObjects === 0 ? 0 : Math.round((item.val / totalObjects) * 100);
                return (
                  <div
                    key={item.label}
                    className={`rounded-xl p-2.5 flex flex-col items-center border ${item.border} ${item.bg}`}
                  >
                    <span className="text-[10px] font-bold text-slate-600">{item.label}</span>
                    <span className="text-base font-black text-slate-900 my-0.5">{item.val}</span>
                    <span className="text-[9px] font-semibold text-slate-500">{pct}%</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Sumber:</span>
              <span className="font-semibold text-slate-700">{detectionData.source}</span>
            </div>
          </div>

          {/* Card Prediksi Panen (XGBoost Regressor) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#97ad82]" />
                <h3 className="text-sm font-black text-[#081a2a]">Estimasi Siklus Panen</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                XGBoost
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Sisa Waktu Panen
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#0c253b]">
                    {harvestData.estimatedDays !== null ? harvestData.estimatedDays : "-"}
                  </span>
                  <span className="text-sm font-bold text-slate-600">Hari</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Urgensi Panen
                </span>
                <span
                  className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${harvestData.urgencyLevel === "High"
                    ? "bg-rose-100 text-rose-800"
                    : harvestData.urgencyLevel === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                    }`}
                >
                  {harvestData.urgencyLevel === "High"
                    ? "Mendesak"
                    : harvestData.urgencyLevel === "Medium"
                      ? "Sedang"
                      : harvestData.urgencyLevel === "Low"
                        ? "Normal"
                        : "Belum Dihitung"}
                </span>
              </div>
            </div>

            {/* Telemetri Sensor Pendukung */}
            {harvestData.sensorUsed && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Kondisi Lingkungan Inkubasi
                </span>
                <div className="flex justify-between">
                  <span>Suhu Udara:</span>
                  <span className="font-bold text-slate-800">{harvestData.sensorUsed.suhu_udara_c} °C</span>
                </div>
                <div className="flex justify-between">
                  <span>Kelembapan Udara:</span>
                  <span className="font-bold text-slate-800">{harvestData.sensorUsed.kelembapan_udara_pct} %</span>
                </div>
                <div className="flex justify-between">
                  <span>Kelembapan Media:</span>
                  <span className="font-bold text-slate-800">{harvestData.sensorUsed.kelembapan_media_pct} %</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
