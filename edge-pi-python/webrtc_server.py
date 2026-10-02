import asyncio
import json
import logging
import os
import cv2
import time
import numpy as np
from datetime import datetime
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [WEBRTC NATIVE] - %(message)s")

# Load YOLO model
model = None
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")
try:
    if os.path.exists(MODEL_PATH):
        from ultralytics import YOLO
        model = YOLO(MODEL_PATH)
        logging.info(f"Loaded YOLOv8 model from {MODEL_PATH} with classes: {model.names}")
    else:
        logging.warning(f"Model file {MODEL_PATH} not found.")
except Exception as e:
    logging.error(f"Error loading YOLO model: {e}")

cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
}

def persist_real_cv_metrics(box_id, baby, adult, prepupa, pupa, total, dominant, conf_score):
    try:
        proportions = {
            "baby_larva": round(baby / total, 4) if total > 0 else 0,
            "adult_larva": round(adult / total, 4) if total > 0 else 0,
            "prepupa": round(prepupa / total, 4) if total > 0 else 0,
            "pupa": round(pupa / total, 4) if total > 0 else 0
        }
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO cv_results (
                box_id, baby_larva, adult_larva, prepupa, pupa,
                total_detected, dominant_phase, confidence_score,
                proportions, image_path, source, timestamp, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            box_id, baby, adult, prepupa, pupa, total,
            dominant, conf_score, json.dumps(proportions), "", "real", timestamp
        ))
        conn.commit()
        conn.close()
        logging.info(f"Persisted Real CV to SQLite: Baby={baby}, Adult={adult}, Prepupa={prepupa}, Pupa={pupa} | Dominant={dominant} | Conf={conf_score:.2f} | Source=real")
    except Exception as e:
        logging.error(f"Error persisting real CV metrics to SQLite: {e}")

class CameraVideoStreamTrack(VideoStreamTrack):
    def __init__(self, camera_source=None):
        super().__init__()
        src = camera_source if camera_source is not None else os.environ.get("CAMERA_SOURCE", "0")
        try:
            self.src_id = int(src)
        except ValueError:
            self.src_id = src

        logging.info(f"Initializing camera source {self.src_id} via AVFoundation...")
        self.cap = cv2.VideoCapture(self.src_id, cv2.CAP_AVFOUNDATION)
        if not self.cap.isOpened():
            self.cap = cv2.VideoCapture(self.src_id)

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        self.is_opened = self.cap.isOpened()
        logging.info(f"Camera opened: {self.is_opened}")

        self.frame_count = 0
        self.start_time = time.time()
        self.fps = 0.0
        self.last_cv_persist_time = 0.0
        self.persist_interval = float(os.environ.get("CV_PERSIST_INTERVAL_SEC", 5.0))

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        frame = None

        if self.cap is not None and self.cap.isOpened():
            ret, read_frame = self.cap.read()
            if ret and read_frame is not None:
                frame = read_frame

        if frame is None:
            if not self.cap.isOpened():
                self.cap.open(self.src_id, cv2.CAP_AVFOUNDATION)

            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "MACOS CAMERA PERMISSION REQUIRED", (30, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 50, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, "System Settings -> Privacy & Security -> Camera", (35, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)
            cv2.putText(frame, "Izinkan Terminal / Python mengakses Kamera Mac", (45, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (16, 185, 129), 1, cv2.LINE_AA)

        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()

        baby, adult, prepupa, pupa = 0, 0, 0, 0
        conf_scores = []
        is_real_detection = False

        if model is not None and frame is not None and (self.cap and self.cap.isOpened()):
            try:
                results = model.predict(source=frame, conf=0.25, verbose=False)
                if results and len(results) > 0:
                    boxes = results[0].boxes
                    for i in range(len(boxes)):
                        cls_id = int(boxes.cls[i])
                        conf = float(boxes.conf[i])
                        conf_scores.append(conf)
                        cls_name = model.names.get(cls_id, "").upper()
                        if "BABY" in cls_name:
                            baby += 1
                        elif "ADULT" in cls_name:
                            adult += 1
                        elif "PREPUPA" in cls_name:
                            prepupa += 1
                        elif "PUPA" in cls_name:
                            pupa += 1
                    frame = results[0].plot()
                    is_real_detection = True
            except Exception as e:
                logging.error(f"YOLO predict error: {e}")

        now = time.time()
        if is_real_detection and (now - self.last_cv_persist_time >= self.persist_interval):
            self.last_cv_persist_time = now
            total = baby + adult + prepupa + pupa
            stage_counts = {"BABY LARVA": baby, "ADULT LARVA": adult, "PREPUPA": prepupa, "PUPA": pupa}
            dominant = max(stage_counts, key=stage_counts.get) if total > 0 else "ADULT LARVA"
            avg_conf = float(sum(conf_scores) / len(conf_scores)) if conf_scores else 0.88
            persist_real_cv_metrics(1, baby, adult, prepupa, pupa, total, dominant, avg_conf)

        status_text = f"MAC CAMERA (AVFoundation) | FPS: {self.fps:.1f}" if (self.cap and self.cap.isOpened()) else "CAMERA NOT AUTHORIZED BY MACOS TCC"
        cv2.putText(frame, status_text, (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (16, 185, 129), 2, cv2.LINE_AA)

        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

    def stop(self):
        super().stop()
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
            logging.info("Camera released.")

pcs = set()

async def offer(request):
    try:
        params = await request.json()
        offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        pc = RTCPeerConnection()
        pcs.add(pc)

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logging.info(f"WebRTC Connection state: {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await pc.close()
                pcs.discard(pc)

        video_track = CameraVideoStreamTrack()
        pc.addTrack(video_track)

        await pc.setRemoteDescription(offer_sdp)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        logging.info("Local WebRTC Handshake successful.")
        return web.Response(
            content_type="application/json",
            text=json.dumps({"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}),
            headers=cors_headers
        )
    except Exception as e:
        logging.error(f"Error handling /offer: {e}")
        return web.Response(status=500, text=json.dumps({"error": str(e)}), headers=cors_headers)

async def handle_options(request):
    return web.Response(headers=cors_headers)

async def handle_health(request):
    return web.Response(
        content_type="application/json",
        text=json.dumps({
            "status": "ok",
            "service": "native_mac_webrtc_cv",
            "bind": "127.0.0.1:8081",
            "model_loaded": model is not None,
            "classes": model.names if model else []
        }),
        headers=cors_headers
    )

async def on_shutdown(app):
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)

def create_app():
    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_get("/", handle_health)
    app.router.add_get("/health", handle_health)
    app.router.add_options("/offer", handle_options)
    app.router.add_post("/offer", offer)
    return app

if __name__ == "__main__":
    init_db()
    app = create_app()
    HOST = "127.0.0.1"
    PORT = 8081
    logging.info(f"Starting Native WebRTC Server locked to {HOST}:{PORT}")
    web.run_app(app, host=HOST, port=PORT)
