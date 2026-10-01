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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [WEBRTC SERVER] - %(message)s")

# Load YOLO model
model = None
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "best.pt")
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

class CVVideoStreamTrack(VideoStreamTrack):
    """
    Video stream track reading from camera, video file, or synthetic frames,
    running YOLOv8 object detection in realtime and returning annotated frames.
    """
    def __init__(self, source=None):
        super().__init__()
        self.source_str = source or os.environ.get("CAMERA_SOURCE", "0")
        
        # Check if source is integer camera index or filepath
        if self.source_str.isdigit():
            self.source = int(self.source_str)
        else:
            self.source = self.source_str

        self.cap = cv2.VideoCapture(self.source)
        self.is_video_file = isinstance(self.source, str) and os.path.exists(self.source)
        
        if not self.cap.isOpened():
            logging.warning(f"VideoCapture could not open {self.source}. Will use synthetic animated pattern.")
            self.cap = None
        else:
            logging.info(f"VideoCapture successfully opened source: {self.source}")

        self.frame_count = 0
        self.start_time = time.time()
        self.fps = 0.0

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        frame = None
        if self.cap is not None and self.cap.isOpened():
            ret, read_frame = self.cap.read()
            if ret:
                frame = read_frame
            elif self.is_video_file:
                # Loop video file
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, read_frame = self.cap.read()
                if ret:
                    frame = read_frame

        if frame is None:
            # Generate animated synthetic maggot culture visualizer
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = (30, 35, 40) # Dark organic background
            
            t = time.time()
            # Draw synthetic container and animated maggot clusters
            cv2.rectangle(frame, (40, 40), (600, 440), (45, 55, 60), -1)
            cv2.rectangle(frame, (40, 40), (600, 440), (80, 95, 100), 2)
            
            # Simulated larvae moving in organic patterns
            for i in range(25):
                angle = t * 0.8 + i * 0.5
                radius = 80 + (i * 7) % 110
                cx = int(320 + radius * np.cos(angle))
                cy = int(240 + (radius * 0.7) * np.sin(angle))
                cv2.ellipse(frame, (cx, cy), (12, 5), int(np.degrees(angle)), 0, 360, (180, 200, 190), -1)
            
            cv2.putText(frame, "MAG-SENSE EDGE CV STREAM", (60, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (16, 185, 129), 2)
            cv2.putText(frame, f"Simulated Camera Feed | Box #1", (60, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Calculate FPS
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()

        # Run YOLO inference if model available
        if model is not None:
            try:
                results = model.predict(source=frame, conf=0.25, verbose=False)
                if results and len(results) > 0:
                    frame = results[0].plot()
            except Exception as e:
                logging.error(f"YOLO predict error: {e}")

        # Overlay Edge telemetry info on frame
        overlay_text = f"FPS: {self.fps:.1f} | Model: YOLOv8"
        cv2.putText(frame, overlay_text, (frame.shape[1] - 220, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 150), 1, cv2.LINE_AA)

        # Convert to av VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

    def stop(self):
        super().stop()
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()

pcs = set()

async def offer(request):
    try:
        params = await request.json()
        offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        pc = RTCPeerConnection()
        pcs.add(pc)

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logging.info(f"WebRTC Connection state is {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await pc.close()
                pcs.discard(pc)

        video_track = CVVideoStreamTrack()
        pc.addTrack(video_track)

        await pc.setRemoteDescription(offer_sdp)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        logging.info("Successfully negotiated WebRTC offer/answer pair.")
        return web.Response(
            content_type="application/json",
            text=json.dumps(
                {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
            ),
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
            "service": "webrtc_cv_server",
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
    port = int(os.environ.get("WEBRTC_PORT", 8081))
    logging.info(f"Starting WebRTC Video Server on http://0.0.0.0:{port}")
    web.run_app(app, host="0.0.0.0", port=port)
