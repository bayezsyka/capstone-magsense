import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import config from '../config';

const PYTHON_URL = config.PYTHON_URL;

export default function CameraSender() {
  const localVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Siap");
  const [facingMode, setFacingMode] = useState('environment'); // Default kamera belakang

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startStream = async () => {
    try {
      stopStream();
      setStatus("Menyiapkan Kamera...");

      // 1. Inisialisasi Socket.IO
      socket.current = io(PYTHON_URL, {
        transports: ['websocket', 'polling']
      });

      // 2. Minta Stream Kamera dengan Resolusi lebih rendah agar stabil dan tidak delay
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        });
      } catch (err) {
        console.warn("Resolusi tidak didukung penuh, fallback ke resolusi yang lebih rendah...", err);
        // Fallback jika HP tidak mendukung constraint 720p
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      }

      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 3. Inisialisasi WebRTC Peer Connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // 4. Masukkan Media Tracks & Paksa Bitrate lebih rendah agar stabil (1 Mbps)
      stream.getTracks().forEach((track) => {
        const sender = peerConnection.current.addTrack(track, stream);

        if (track.kind === 'video' && sender.setParameters) {
          const parameters = sender.getParameters();
          if (!parameters.encodings) parameters.encodings = [{}];

          // Mengeset Bitrate Maksimum 1.000 Kbps (1 Mbps)
          parameters.encodings[0].maxBitrate = 1000000;

          sender.setParameters(parameters).catch((e) =>
            console.error("Gagal mengeset bitrate WebRTC:", e)
          );
        }
      });

      // 5. Handling ICE Candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket.current) {
          socket.current.emit("webrtc-candidate", event.candidate);
        }
      };

      // 6. Buat WebRTC Offer
      const offer = await peerConnection.current.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      await peerConnection.current.setLocalDescription(offer);
      socket.current.emit("webrtc-offer", offer);

      setStatus("Streaming Active!");

      // 7. Event Handler untuk Signaling Answer & Candidate
      socket.current.on("webrtc-answer", async (answer) => {
        try {
          if (
            peerConnection.current &&
            peerConnection.current.signalingState === "have-local-offer"
          ) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
          }
        } catch (err) {
          console.error("Gagal menetapkan Remote Description (Answer):", err);
        }
      });

      socket.current.on("webrtc-candidate", async (candidate) => {
        try {
          if (
            peerConnection.current &&
            peerConnection.current.remoteDescription
          ) {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          }
        } catch (err) {
          console.error("Gagal menambahkan ICE Candidate:", err);
        }
      });

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    if (streamRef.current) {
      startStream();
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-800">Kamera HP (Sender)</h2>
        <div
          className={`text-xs inline-block px-3 py-1 rounded-full mx-auto font-medium ${status.includes("Error")
              ? "bg-red-100 text-red-600"
              : status.includes("Active")
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
        >
          ● {status}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video shadow-2xl border-4 border-slate-800 relative">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={startStream}
          className="col-span-2 bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all hover:bg-emerald-700 text-sm"
        >
          Mulai Stream
        </button>
        <button
          onClick={stopStream}
          className="bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl active:scale-95 transition-all hover:bg-slate-300 text-sm"
        >
          Stop
        </button>
      </div>

      <button
        onClick={toggleCamera}
        className="w-full text-xs text-slate-500 underline hover:text-slate-700 transition"
      >
        Ubah ke Kamera {facingMode === 'user' ? 'Belakang' : 'Depan'}
      </button>

      <p className="text-[10px] text-slate-400 italic">
        Pastikan koneksi stabil untuk transmisi video tanpa delay
      </p>
    </div>
  );
}