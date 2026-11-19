import json
import logging
import os
from typing import Any, Dict, List, Tuple

import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("cv_server")


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, default)))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


CONF = _env_float("YOLO_CONF", 0.25)
IOU = _env_float("YOLO_IOU", 0.6)
# Must match TRAIN_IMGSZ=960 used to train best.pt (capstone6_v28.ipynb, run
# maggot_yolov8n_v28) so production inference sees the same object scale.
IMGSZ = _env_int("YOLO_IMGSZ", 960)
MAX_DET = _env_int("YOLO_MAX_DET", 3000)
AUGMENT = os.getenv("YOLO_AUGMENT", "false").lower() in {"1", "true", "yes"}

# Model class ids: 0 Adult, 1 Baby, 2 Prepupa, 3 Pupa.
# Calibrated for best.pt v28 (run maggot_yolov8n_v28) from 12D-KOREKSI in
# capstone6_v28.ipynb: P/R computed AT each threshold on the validation set.
# v28 recommendation was Adult 0.55 / Baby 0.20 / Prepupa 0.40 / Pupa 0.20.
# Live defaults below are deliberately recall-first (small maggots on 720p
# frames sit close to the detection limit): raise Adult first (0.40 -> 0.55)
# if the dashboard shows too many false positives.
# Override per class via YOLO_CLASS_CONF, e.g. '{"0": 0.55, "2": 0.40}'.
def _class_thresholds() -> Dict[int, float]:
    defaults = {0: 0.40, 1: 0.25, 2: 0.30, 3: 0.25}
    try:
        values = json.loads(os.getenv("YOLO_CLASS_CONF", "{}"))
        for key, value in values.items():
            class_id = int(key)
            if class_id in defaults:
                defaults[class_id] = min(0.99, max(0.05, float(value)))
    except (TypeError, ValueError, json.JSONDecodeError):
        logger.warning("Invalid YOLO_CLASS_CONF; using defaults")
    return defaults

CLASS_CONF = _class_thresholds()
# Jalur upload (/scan) memakai tiling hanya untuk gambar ber-resolusi tinggi
# (foto >= ~1920px), karena frame webcam ditangani jalur live di predict_frame()
# dengan grid 2x2 (lihat YOLO_LIVE_TILES). Pada upload, objek di foto besar
# sudah cukup besar; pada frame 720p objek kecil, sehingga justru butuh tiling.
TILED_MIN_LONG_SIDE = _env_int("TILED_MIN_LONG_SIDE", 1920)
# 960 matches TRAIN_IMGSZ of best.pt, so each tile is fed at its native
# training scale (no upscale/downscale distortion at tile edges).
TILE_SIZE = _env_int("TILE_SIZE", 960)
TILE_OVERLAP = min(0.8, max(0.05, _env_float("TILE_OVERLAP", 0.25)))
BORDER_PX = _env_int("TILE_BORDER_PX", 6)
NMS_IOU = _env_float("TILE_NMS_IOU", 0.5)


def _iou(a: np.ndarray, b: np.ndarray) -> float:
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1])
    area_b = max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0


def _class_nms(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    kept: List[Dict[str, Any]] = []
    for class_id in sorted({item["class_id"] for item in detections}):
        candidates = sorted(
            (item for item in detections if item["class_id"] == class_id),
            key=lambda item: item["confidence"],
            reverse=True,
        )
        while candidates:
            best = candidates.pop(0)
            kept.append(best)
            candidates = [
                item for item in candidates
                if _iou(np.array(best["xyxy"]), np.array(item["xyxy"])) < NMS_IOU
            ]
    return sorted(kept, key=lambda item: item["confidence"], reverse=True)[:MAX_DET]


def _result_boxes(
    result: Any,
    offset_x: int = 0,
    offset_y: int = 0,
    image_width: int | None = None,
    image_height: int | None = None,
) -> List[Dict[str, Any]]:
    output: List[Dict[str, Any]] = []
    if result is None or result.boxes is None:
        return output
    for index in range(len(result.boxes)):
        confidence = float(result.boxes.conf[index])
        class_id = int(result.boxes.cls[index])
        if confidence < CLASS_CONF.get(class_id, CONF):
            continue
        xyxy = result.boxes.xyxy[index].tolist()
        coordinates = [xyxy[0] + offset_x, xyxy[1] + offset_y, xyxy[2] + offset_x, xyxy[3] + offset_y]
        if image_width is not None and image_height is not None:
            coordinates = [
                max(0.0, min(float(image_width), coordinates[0])),
                max(0.0, min(float(image_height), coordinates[1])),
                max(0.0, min(float(image_width), coordinates[2])),
                max(0.0, min(float(image_height), coordinates[3])),
            ]
        if coordinates[2] <= coordinates[0] or coordinates[3] <= coordinates[1]:
            continue
        output.append({"xyxy": coordinates, "confidence": confidence, "class_id": class_id})
    return output


def predict(model: YOLO, image: np.ndarray) -> tuple[List[Dict[str, Any]], str]:
    height, width = image.shape[:2]
    use_tiles = max(width, height) >= TILED_MIN_LONG_SIDE
    if not use_tiles:
        results = model.predict(
            source=image, conf=CONF, iou=IOU, imgsz=IMGSZ, max_det=MAX_DET, augment=AUGMENT, verbose=False
        )
        return _result_boxes(results[0] if results else None, image_width=width, image_height=height), "single"

    step = max(1, int(TILE_SIZE * (1 - TILE_OVERLAP)))

    def _starts(length: int) -> List[int]:
        if length <= TILE_SIZE:
            return [0]
        starts = list(range(0, length - TILE_SIZE + 1, step))
        last = length - TILE_SIZE
        if starts[-1] != last:
            starts.append(last)
        return starts

    detections: List[Dict[str, Any]] = []
    for top in _starts(height):
        for left in _starts(width):
            right, bottom = min(left + TILE_SIZE, width), min(top + TILE_SIZE, height)
            tile = image[top:bottom, left:right]
            results = model.predict(
                source=tile, conf=CONF, iou=IOU, imgsz=IMGSZ, max_det=MAX_DET, augment=AUGMENT, verbose=False
            )
            for detection in _result_boxes(
                results[0] if results else None,
                left,
                top,
                width,
                height,
            ):
                x1, y1, x2, y2 = detection["xyxy"]
                touches_tile_border = (
                    (left > 0 and x1 <= left + BORDER_PX)
                    or (top > 0 and y1 <= top + BORDER_PX)
                    or (right < width and x2 >= right - BORDER_PX)
                    or (bottom < height and y2 >= bottom - BORDER_PX)
                )
                # Border boxes are retained when they are on the outer image edge;
                # overlapping interior boxes are removed by class-aware NMS below.
                detection["border"] = touches_tile_border
                detections.append(detection)

    result = _class_nms(detections)
    logger.info(
        "Inference mode=tiled image=%sx%s tilesize=%s overlap=%.2f detections=%s",
        width, height, TILE_SIZE, TILE_OVERLAP, len(result),
    )
    return result, "tiled"


# =====================================================================
# Live-camera inference (WebRTC path)
# =====================================================================
# Frame webcam C270 (1280x720) berisi larva kecil (10-20 px). Bila frame
# dikirim utuh ke imgsz 960, objek makin kecil dari skala training dan
# terlewat. Jalur live karena itu memotong frame menjadi grid (default 2x2,
# overlap 15%) dan menginferensi tiap tile pada imgsz training, lalu
# menggabungkan hasilnya dengan NMS per kelas (fungsi yang sama dengan
# jalur upload). Matikan lewat YOLO_LIVE_TILING=0 bila perangkat terlalu
# lambat, naikkan YOLO_LIVE_TILES=3 hanya bila CPU sangat kuat.
LIVE_TILING = os.getenv("YOLO_LIVE_TILING", "1").lower() in {"1", "true", "yes"}
LIVE_TILES = max(1, min(6, _env_int("YOLO_LIVE_TILES", 2)))
LIVE_TILE_OVERLAP = min(0.5, max(0.0, _env_float("YOLO_LIVE_TILE_OVERLAP", 0.15)))
# Ambang mentah untuk live: sedikit di bawah ambang per kelas terendah supaya
# penyaringan tetap dilakukan CLASS_CONF (per kelas), bukan satu ambang global.
LIVE_RAW_CONF = _env_float(
    "YOLO_LIVE_RAW_CONF",
    max(0.01, min(CLASS_CONF.values()) - 0.05),
)


def _grid_slices(length: int, tiles: int, overlap: float) -> List[Tuple[int, int]]:
    """Bagi sumbu `length` menjadi `tiles` potongan dengan overlap tertentu."""
    if tiles <= 1 or length <= 0:
        return [(0, length)]
    overlap = min(0.5, max(0.0, overlap))
    tile = int(round(length / (tiles - (tiles - 1) * overlap)))
    tile = max(1, min(length, tile))
    step = max(1, int(round(tile * (1 - overlap))))
    starts: List[int] = []
    for index in range(tiles):
        start = min(index * step, length - tile)
        if starts and start <= starts[-1]:
            start = min(length - tile, starts[-1] + step)
        starts.append(max(0, start))
    if starts and starts[-1] + tile < length:
        starts[-1] = length - tile
    return [(start, min(length, start + tile)) for start in starts]


def predict_frame(model: YOLO, frame: np.ndarray, tiled: bool | None = None) -> tuple[List[Dict[str, Any]], str]:
    """Deteksi pada satu frame kamera.

    Mengembalikan (detections, mode) dengan koordinat xyxy pada frame asli.
    `detections` sudah difilter ambang per kelas (CLASS_CONF).
    """
    if frame is None or getattr(frame, "size", 0) == 0:
        return [], "empty"

    height, width = frame.shape[:2]
    if tiled is None:
        tiled = LIVE_TILING and LIVE_TILES > 1

    if not tiled:
        results = model.predict(
            source=frame,
            conf=LIVE_RAW_CONF,
            iou=IOU,
            imgsz=IMGSZ,
            max_det=MAX_DET,
            verbose=False,
        )
        return (
            _result_boxes(results[0] if results else None, image_width=width, image_height=height),
            "single",
        )

    detections: List[Dict[str, Any]] = []
    for top, bottom in _grid_slices(height, LIVE_TILES, LIVE_TILE_OVERLAP):
        for left, right in _grid_slices(width, LIVE_TILES, LIVE_TILE_OVERLAP):
            tile = frame[top:bottom, left:right]
            results = model.predict(
                source=tile,
                conf=LIVE_RAW_CONF,
                iou=IOU,
                imgsz=IMGSZ,
                max_det=MAX_DET,
                verbose=False,
            )
            detections.extend(
                _result_boxes(results[0] if results else None, left, top, width, height)
            )

    return _class_nms(detections), "tiled"

