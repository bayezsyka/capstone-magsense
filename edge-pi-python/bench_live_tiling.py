"""Bandingkan deteksi live: full-frame vs tiling, pada frame webcam asli.

Pemakaian (dari folder edge-pi-python):

    python bench_live_tiling.py frame1.jpg frame2.jpg
    python bench_live_tiling.py D:\\frames\\*.jpg            # shell akan expand
    python bench_live_tiling.py frame.jpg --tiles 2 3       # banding 2x2 vs 3x3

Output: jumlah deteksi per kelas (setelah ambang per kelas), latensi per
frame, dan gambar beranotasi di folder ``bench_out/``.

Tujuan: membuktikan bahwa tiling mengembalikan larva kecil ke skala training
SEBELUM di-deploy ke server. Menjalankan skrip ini tidak mengubah apa pun di
produksi.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import cv2

from inference import CLASS_CONF, IMGSZ, _class_nms, _result_boxes  # noqa: F401

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best.pt"
OUTPUT_DIR = BASE_DIR / "bench_out"
CLASS_COLORS = {0: (0, 140, 255), 1: (0, 255, 0), 2: (255, 128, 0), 3: (255, 0, 255)}


def grid_slices(length: int, tiles: int, overlap: float):
    if tiles <= 1 or length <= 0:
        return [(0, length)]
    overlap = min(0.5, max(0.0, overlap))
    tile = int(round(length / (tiles - (tiles - 1) * overlap)))
    tile = max(1, min(length, tile))
    step = max(1, int(round(tile * (1 - overlap))))
    starts = []
    for index in range(tiles):
        start = min(index * step, length - tile)
        if starts and start <= starts[-1]:
            start = min(length - tile, starts[-1] + step)
        starts.append(max(0, start))
    if starts and starts[-1] + tile < length:
        starts[-1] = length - tile
    return [(start, min(length, start + tile)) for start in starts]


def detect(model, frame, tiles: int, overlap: float, raw_conf: float):
    height, width = frame.shape[:2]
    if tiles <= 1:
        results = model.predict(
            source=frame, conf=raw_conf, iou=0.6, imgsz=IMGSZ, verbose=False
        )
        detections = _result_boxes(
            results[0] if results else None, image_width=width, image_height=height
        )
        return detections, "single"

    detections = []
    for top, bottom in grid_slices(height, tiles, overlap):
        for left, right in grid_slices(width, tiles, overlap):
            tile = frame[top:bottom, left:right]
            results = model.predict(
                source=tile, conf=raw_conf, iou=0.6, imgsz=IMGSZ, verbose=False
            )
            detections.extend(
                _result_boxes(results[0] if results else None, left, top, width, height)
            )
    return _class_nms(detections), f"tiled-{tiles}x{tiles}"


def annotate(model, frame, detections, label: str):
    canvas = frame.copy()
    counts = {}
    for det in detections:
        x1, y1, x2, y2 = [int(round(value)) for value in det["xyxy"]]
        class_id = det["class_id"]
        name = model.names.get(class_id, str(class_id)).upper()
        counts[name] = counts.get(name, 0) + 1
        color = CLASS_COLORS.get(class_id, (0, 255, 255))
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 1)
        cv2.putText(
            canvas, f"{name.split()[0]} {det['confidence']:.2f}",
            (x1 + 1, max(10, y1 - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1, cv2.LINE_AA,
        )
    summary = "  ".join(f"{key}:{value}" for key, value in sorted(counts.items())) or "-"
    cv2.putText(
        canvas, f"{label} | {summary}", (12, 24),
        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1, cv2.LINE_AA,
    )
    return canvas, counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", help="frame webcam (jpg/png)")
    parser.add_argument("--tiles", nargs="+", type=int, default=[1, 2],
                        help="jumlah tile per sisi yang dibandingkan (default: 1 2)")
    parser.add_argument("--overlap", type=float, default=0.15, help="overlap antar tile (0-0.5)")
    parser.add_argument("--raw-conf", type=float, default=0.05, help="ambang mentah sebelum filter per kelas")
    args = parser.parse_args()

    if not MODEL_PATH.is_file():
        sys.exit(f"best.pt tidak ditemukan di {MODEL_PATH}")

    from ultralytics import YOLO

    model = YOLO(str(MODEL_PATH))
    print(f"Model     : {MODEL_PATH.name} | kelas: {model.names}")
    print(f"imgsz     : {IMGSZ} | ambang per kelas: {CLASS_CONF}")
    print(f"Kamera asli frame: lihat ukuran tiap gambar di bawah\n")

    OUTPUT_DIR.mkdir(exist_ok=True)
    totals = {tiles: {} for tiles in args.tiles}

    for image_path in args.images:
        frame = cv2.imread(image_path)
        if frame is None:
            print(f"[skip] tidak bisa membaca {image_path}")
            continue
        print(f"== {Path(image_path).name} ({frame.shape[1]}x{frame.shape[0]}) ==")
        for tiles in args.tiles:
            started = time.time()
            detections, mode = detect(model, frame, tiles, args.overlap, args.raw_conf)
            elapsed_ms = (time.time() - started) * 1000.0
            canvas, counts = annotate(model, frame, detections, mode)
            out_path = OUTPUT_DIR / f"{Path(image_path).stem}_{mode}.jpg"
            cv2.imwrite(str(out_path), canvas)

            for name, count in counts.items():
                totals[tiles][name] = totals[tiles].get(name, 0) + count
            detail = ", ".join(f"{name}={count}" for name, count in sorted(counts.items())) or "tidak ada"
            print(f"   {mode:<12} deteksi={len(detections):4d} | {elapsed_ms:7.1f} ms | {detail}")

    print("\n== TOTAL seluruh frame ==")
    for tiles in args.tiles:
        mode = "single" if tiles <= 1 else f"tiled-{tiles}x{tiles}"
        detail = ", ".join(f"{name}={count}" for name, count in sorted(totals[tiles].items())) or "tidak ada"
        print(f"   {mode:<12} {detail}")
    print(f"\nGambar beranotasi: {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
