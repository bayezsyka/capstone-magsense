import asyncio
import datetime
import torch
from ultralytics import YOLO
from aiohttp import web
import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
import cv2
from concurrent.futures import ThreadPoolExecutor

# 1. Inisialisasi Model YOLOv8 & Paksa Akselerasi CUDA GPU
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"⚡ Device yang digunakan: {device.upper()}")

model = YOLO('best.pt')
model.to(device)  # Memindahkan model ke GPU jika CUDA tersedia

print("\n=== URUTAN KELAS ASLI DI MODEL YOLOV8 ANDA ===")
print(model.names)
print("==============================================\n")

# ThreadPoolExecutor untuk pemrosesan inference YOLO tanpa memblokir Event Loop asyncio
executor = ThreadPoolExecutor(max_workers=2)

# Setup Async Socket.IO Server & Aiohttp App
sio = socketio.AsyncServer(cors_allowed_origins="*")
app = web.Application()
sio.attach(app)

relay = MediaRelay()
pcs = set()

class MaggotDetectorTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self, track):
        super().__init__()
        self.track = track
        self.frame_skip_count = 0 

    async def recv(self):
        try:
            frame = await self.track.recv()
        except Exception:
            raise Exception("Track stopped")
        
        # --- STRATEGI OPTIMALISASI 1: FRAME SKIPPING ---
        # Memproses 1 dari setiap 3 frame agar FPS tetap tinggi & responsif
        self.frame_skip_count += 1
        if self.frame_skip_count % 3 != 0:
            return frame

        # Konversi VideoFrame WebRTC ke ndarray OpenCV (BGR)
        img = frame.to_ndarray(format="bgr24")

        # --- STRATEGI OPTIMALISASI 2: ASYNC GPU OFFLOADING ---
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            executor, 
            lambda: model(img, verbose=False, conf=0.5, device=device)
        )
        
        counts = {"babyLarva": 0, "adultLarva": 0, "prepupa": 0, "pupa": 0}

        annotated_frame = img.copy()
        if len(results) > 0:
            annotated_frame = results[0].plot() 
            for box in results[0].boxes:
                cls_id = int(box.cls[0].item())
                
                if cls_id in model.names:
                    class_name = model.names[cls_id].lower().replace(" ", "").replace("-", "").replace("_", "")
                    
                    if "baby" in class_name:
                        counts["babyLarva"] += 1
                    elif "prepupa" in class_name:
                        counts["prepupa"] += 1
                    elif "pupa" in class_name: 
                        counts["pupa"] += 1
                    elif "adult" in class_name or "larva" in class_name:
                        counts["adultLarva"] += 1

        dominant = "TIDAK TERDETEKSI"
        max_val = max(counts.values())
        if max_val > 0:
            for k, v in counts.items():
                if v == max_val:
                    dominant = k.upper().replace("LARVA", " LARVA")
                    break

        now = datetime.datetime.now().strftime("%H:%M:%S WIB")
        
        try:
            # Emit data statistik deteksi ke React
            await sio.emit("detection-data", {
                "time": now,
                "babyLarva": counts["babyLarva"],
                "adultLarva": counts["adultLarva"],
                "prepupa": counts["prepupa"],
                "pupa": counts["pupa"],
                "dominant": dominant
            })

            # --- STRATEGI OPTIMALISASI 3: BINARY ARRAYBUFFER TRANSMISSION ---
            # Kompresi JPEG kualitas 70% untuk efisiensi transfer jaringan
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
            _, buffer = cv2.imencode('.jpg', annotated_frame, encode_param)
            
            # Pengiriman data biner mentah (ArrayBuffer) tanpa Base64 encoding
            await sio.emit("video-frame-bytes", bytes(buffer))
            
        except Exception as e:
            print(f"⚠️ Socket Error: {e}")

        new_frame = VideoFrame.from_ndarray(annotated_frame, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame

@sio.on('webrtc-offer')
async def handle_offer(sid, offer_data):
    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"🌐 WebRTC Connection State: {pc.connectionState}")
        if pc.connectionState in ["failed", "closed"]:
            try:
                await pc.close()
            except Exception as e:
                print(f"⚠️ Error saat menutup PC: {e}")
            finally:
                pcs.discard(pc)
                print("🔒 WebRTC Connection closed cleanly.")

    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            local_video = MaggotDetectorTrack(relay.subscribe(track))
            pc.addTrack(local_video)

    offer = RTCSessionDescription(sdp=offer_data['sdp'], type=offer_data['type'])
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await sio.emit('webrtc-answer', {'sdp': pc.localDescription.sdp, 'type': pc.localDescription.type}, room=sid)

@sio.on('webrtc-candidate')
async def handle_candidate(sid, candidate_data):
    # Penanganan ICE Candidate untuk koneksi jaringan jarak jauh / NAT
    pass

# Graceful Shutdown Handler
async def on_shutdown(app):
    print("🛑 Shutting down server, closing all WebRTC connections...")
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros, return_exceptions=True)
    pcs.clear()

app.on_shutdown.append(on_shutdown)

if __name__ == "__main__":
    print(f"🚀 Python AI Server Running on Port 5002 (CUDA Engine: {device.upper()})")
    web.run_app(app, host="0.0.0.0", port=5002)