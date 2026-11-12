import json
import logging
import os
from typing import Any, Dict, List

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
# Must match TRAIN_IMGSZ=960 used to train best.pt (capstone5.ipynb, run
# maggot_yolov8n_v22) so production inference sees the same object scale.
IMGSZ = _env_int("YOLO_IMGSZ", 960)
MAX_DET = _env_int("YOLO_MAX_DET", 3000)
AUGMENT = os.getenv("YOLO_AUGMENT", "false").lower() in {"1", "true", "yes"}

# Model class ids: 0 Adult, 1 Baby, 2 Prepupa, 3 Pupa.
# Calibrated from the validation-threshold sweep in capstone5.ipynb (cell 12D,
# F1-optimal per class on the validation set): Adult 0.90, Baby 0.50,
# Prepupa 0.78, Pupa 0.47. Production defaults below are a compromise between
# those peaks and recall: valid detections typically score >=0.75, while
# low-confidence noise on substrate/shaded areas (0.30-0.68) is suppressed.
# Prepupa has the weakest precision (test P=0.79, Prepupa<->Pupa confusion), so
# its threshold is kept clearly above the noise band. Override per class via
# YOLO_CLASS_CONF, e.g. '{"0": 0.9, "2": 0.78}'.
def _class_thresholds() -> Dict[int, float]:
    defaults = {0: 0.65, 1: 0.45, 2: 0.70, 3: 0.45}
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
# Tiling (slice + per-tile predict) hanya menguntungkan untuk gambar ber-
# resolusi tinggi (foto unggahan >= ~1920px): recall naik karena objek tetap
# pada skala training. Untuk frame webcam C270 (1280x720), benchmark CPU
# (bench_webcam_v2) menunjukkan tiled 960/960 2-3x lebih lambat (573-826 ms
# vs 272-295 ms single) tanpa peningkatan deteksi yang berarti, dan pada
# full-tray 720p tiled justru kehilangan seluruh deteksi karena objek mengecil
# di bawah skala training. 1920 memastikan frame webcam lewat jalur single
# yang cepat, sementara foto high-res tetap di-tile.
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
