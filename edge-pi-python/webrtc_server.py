import asyncio
import json
import logging
import os
import cv2
import time
import numpy as np
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame

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

class CameraVideoStreamTrack(VideoStreamTrack):
    """
    Native video stream track accessing physical Mac camera (AVFoundation via cv2.VideoCapture(0)).
    Runs realtime YOLOv8 inference and returns annotated VideoFrame to WebRTC.
    """
    def __init__(self, camera_index=0):
        super().__init__()
        self.camera_index = camera_index
        logging.info(f"Opening physical macOS camera index {self.camera_index}...")
        self.cap = cv2.VideoCapture(self.camera_index)
        
        # Configure standard resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        if not self.cap.isOpened():
            logging.warning(f"Native camera index {self.camera_index} could not be opened directly.")
        else:
            logging.info(f"Native camera index {self.camera_index} successfully opened.")

        self.frame_count = 0
        self.start_time = time.time()
        self.fps = 0.0

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        frame = None
        if self.cap is not None and self.cap.isOpened():
            ret, read_frame = self.cap.read()
            if ret and read_frame is not None:
                frame = read_frame

        if frame is None:
            # Fallback if camera stream interrupted
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "WAITING FOR CAMERA FEED...", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

        # FPS calculation
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()

        # Run YOLO inference
        if model is not None:
            try:
                results = model.predict(source=frame, conf=0.25, verbose=False)
                if results and len(results) > 0:
                    frame = results[0].plot()
            except Exception as e:
                logging.error(f"YOLO predict error: {e}")

        # Add HUD overlay
        overlay = f"MAC LOCAL CAMERA | FPS: {self.fps:.1f}"
        cv2.putText(frame, overlay, (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (16, 185, 129), 2, cv2.LINE_AA)

        # Convert to av VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

    def stop(self):
        super().stop()
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
            logging.info("Camera released successfully.")

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

        video_track = CameraVideoStreamTrack(camera_index=0)
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
    app = create_app()
    # STRICT LOOPBACK BIND: 127.0.0.1 ONLY (NOT 0.0.0.0)
    HOST = "127.0.0.1"
    PORT = 8081
    logging.info(f"Starting Native WebRTC Server locked to {HOST}:{PORT}")
    web.run_app(app, host=HOST, port=PORT)
