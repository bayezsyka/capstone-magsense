import asyncio
import json
import logging
import cv2
import time
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from ultralytics import YOLO
import cv_worker

logging.basicConfig(level=logging.INFO)

try:
    model = YOLO("best.pt")
except:
    model = None


# Customize CORS to allow the React frontend
cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
}

latest_frame = None

class CameraVideoStreamTrack(VideoStreamTrack):
    """
    A video stream track that returns frames from a local OpenCV camera.
    """
    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.last_save_time = 0
        
    async def recv(self):
        global latest_frame
        pts, time_base = await self.next_timestamp()

        # Read frame from camera
        ret, frame = self.cap.read()
        if not ret:
            frame = cv2.UMat((480, 640, 3), (0, 0, 0)).get()
            
        latest_frame = frame.copy()
        current_time = time.time()
            
        if model is not None:
            results = model.predict(source=frame, save=False, verbose=False)
            if results:
                frame = results[0].plot() # Draw bounding boxes
                
                # Auto-save every 10 seconds
                if current_time - self.last_save_time >= 10:
                    cv_worker.process_frame(latest_frame.copy(), box_id=1)
                    self.last_save_time = current_time

        # Convert to av.VideoFrame
        video_frame = VideoFrame.from_ndarray(frame, format="bgr24")
        video_frame.pts = pts
        video_frame.time_base = time_base

        return video_frame

    def stop(self):
        super().stop()
        if self.cap.isOpened():
            self.cap.release()

pcs = set()

async def offer(request):
    params = await request.json()
    offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pcs.add(pc)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logging.info(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await pc.close()
            pcs.discard(pc)

    # Attach the local camera video track to the WebRTC connection
    video_track = CameraVideoStreamTrack()
    pc.addTrack(video_track)

    await pc.setRemoteDescription(offer_sdp)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        ),
        headers=cors_headers
    )

async def handle_options(request):
    return web.Response(headers=cors_headers)

async def on_shutdown(app):
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)

if __name__ == "__main__":
    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_options("/offer", handle_options)
    app.router.add_post("/offer", offer)
    
    logging.info("Starting WebRTC Video Server on http://0.0.0.0:8081")
    web.run_app(app, host="0.0.0.0", port=8081)
