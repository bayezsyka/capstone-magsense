import asyncio
import json
import logging
import os
import threading
import time

import cv2
import numpy as np
from datetime import datetime
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from local_db import init_db, get_db_connection

# Backward compatibility: YOLO_IMGSZ_LIVE previously controlled only the live
# path. inference.IMGSZ reads YOLO_IMGSZ, so mirror it before importing.
if os.getenv("YOLO_IMGSZ_LIVE") and not os.getenv("YOLO_IMGSZ"):
    os.environ["YOLO_IMGSZ"] = os.environ["YOLO_IMGSZ_LIVE"]

# Shared inference settings + live tiling helper. Both the /scan endpoint and
# the live-camera path therefore use identical per-class thresholds and NMS.
from inference import (
    CLASS_CONF,
    IMGSZ,
    LIVE_RAW_CONF,
    LIVE_TILE_OVERLAP,
    LIVE_TILES,
    LIVE_TILING,
    predict_frame,
)

# Camera capture resolution. The C270 supports 1280x720 (MJPG). Capturing at
# 640x480 (previous default) shrank maggots to a few pixels before inference,
# which was a major cause of missed detections in live view.
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "1280"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "720"))
CAMERA_FPS = int(os.getenv("CAMERA_FPS", "30"))
CAMERA_FOURCC = os.getenv("CAMERA_FOURCC", "MJPG").strip().upper()

# Detection runs in a background thread using the newest available frame, so
# video keeps streaming at camera FPS even when the CPU needs hundreds of ms
# per tiled inference. Interval = minimum seconds between detections.
try:
    LIVE_DETECT_INTERVAL = max(0.1, float(os.getenv("YOLO_LIVE_DETECT_INTERVAL", "0.7")))
except (TypeError, ValueError):
    LIVE_DETECT_INTERVAL = 0.7

CLASS_COLORS = {0: (0, 140, 255), 1: (0, 255, 0), 2: (255, 128, 0), 3: (255, 0, 255)}

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

        # MJPG is required for 720p on most USB webcams (incl. C270); without it
        # the driver silently falls back to low-res YUY2.
        if CAMERA_FOURCC:
            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*CAMERA_FOURCC))
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS, CAMERA_FPS)

        self.is_opened = self.cap.isOpened()
        actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        logging.info(
            "Camera opened: %s | requested %sx%s@%s fps | actual %sx%s",
            self.is_opened, CAMERA_WIDTH, CAMERA_HEIGHT, CAMERA_FPS,
            actual_width, actual_height,
        )

        self.frame_count = 0
        self.start_time = time.time()
        self.fps = 0.0
        self.last_cv_persist_time = 0.0
        self.persist_interval = float(os.environ.get("CV_PERSIST_INTERVAL_SEC", 5.0))

        # --- Live inference state (background worker) ---
        self._running = True
        self._frame_lock = threading.Lock()
        self._det_lock = threading.Lock()
        self._latest_frame = None
        self._detections = []
        self._detect_mode = "idle"
        self._detect_time = 0.0
        self._last_detect_at = 0.0
        self._worker = threading.Thread(target=self._detect_loop, daemon=True)
        self._worker.start()
        logging.info(
            "Live detection worker started (imgsz=%s, interval=%.2fs)",
            IMGSZ, LIVE_DETECT_INTERVAL,
        )

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

        # Publish the newest frame for the background detector, then draw the
        # most recent detections. Detection (tiled) is decoupled from video FPS.
        if model is not None and frame is not None and (self.cap and self.cap.isOpened()):
            with self._frame_lock:
                self._latest_frame = frame.copy()
            with self._det_lock:
                detections = list(self._detections)
                detect_mode = self._detect_mode
                detect_ms = self._detect_time * 1000.0
            baby, adult, prepupa, pupa = self._draw_detections(frame, detections)
            conf_scores = [det["confidence"] for det in detections]
            is_real_detection = True
        else:
            baby, adult, prepupa, pupa = 0, 0, 0, 0
            conf_scores = []
            is_real_detection = False
            detect_mode, detect_ms = "idle", 0.0

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

        if model is not None and (self.cap and self.cap.isOpened()):
            counts_text = (
                f"ADULT {adult}  BABY {baby}  PREPUPA {prepupa}  PUPA {pupa}"
                f"   ({detect_mode}, {detect_ms:.0f} ms)"
            )
            cv2.putText(frame, counts_text, (20, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1, cv2.LINE_AA)

        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

    # ------------------------------------------------------------------
    # Live tiled detection (background thread)
    # ------------------------------------------------------------------
    def _detect_loop(self):
        while self._running:
            frame = None
            with self._frame_lock:
                if self._latest_frame is not None:
                    frame = self._latest_frame
                    self._latest_frame = None

            if frame is None or model is None:
                time.sleep(0.03)
                continue
            if time.time() - self._last_detect_at < LIVE_DETECT_INTERVAL:
                time.sleep(0.02)
                continue

            self._last_detect_at = time.time()
            started = time.time()
            try:
                detections, mode = predict_frame(model, frame)
            except Exception as error:
                logging.error(f"Live predict error: {error}")
                time.sleep(0.2)
                continue

            with self._det_lock:
                self._detections = detections
                self._detect_mode = mode
                self._detect_time = time.time() - started

    def _draw_detections(self, frame, detections):
        counts = {"BABY": 0, "ADULT": 0, "PREPUPA": 0, "PUPA": 0}
        for det in detections:
            x1, y1, x2, y2 = [int(round(value)) for value in det["xyxy"]]
            class_id = det["class_id"]
            confidence = det["confidence"]
            name = (model.names.get(class_id, str(class_id)) if model else str(class_id)).upper()
            if "BABY" in name:
                counts["BABY"] += 1
            elif "ADULT" in name:
                counts["ADULT"] += 1
            elif "PREPUPA" in name:
                counts["PREPUPA"] += 1
            elif "PUPA" in name:
                counts["PUPA"] += 1

            color = CLASS_COLORS.get(class_id, (0, 255, 255))
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
            label = f"{name.split()[0]} {confidence:.2f}"
            (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.35, 1)
            cv2.rectangle(frame, (x1, max(0, y1 - text_h - 3)), (x1 + text_w + 2, y1), color, -1)
            cv2.putText(
                frame, label, (x1 + 1, max(text_h, y1 - 2)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1, cv2.LINE_AA,
            )
        return counts["BABY"], counts["ADULT"], counts["PREPUPA"], counts["PUPA"]

    def stop(self):
        self._running = False
        if self._worker is not None and self._worker.is_alive():
            self._worker.join(timeout=1.0)
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
            "classes": model.names if model else [],
            "live": {
                "imgsz": IMGSZ,
                "tiling": LIVE_TILING,
                "tiles": LIVE_TILES,
                "tile_overlap": LIVE_TILE_OVERLAP,
                "detect_interval_sec": LIVE_DETECT_INTERVAL,
                "raw_conf": LIVE_RAW_CONF,
                "class_conf": {str(key): value for key, value in CLASS_CONF.items()},
                "camera": {
                    "width": CAMERA_WIDTH,
                    "height": CAMERA_HEIGHT,
                    "fps": CAMERA_FPS,
                    "fourcc": CAMERA_FOURCC,
                },
            },
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
