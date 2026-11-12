"""
Diagnosa salah klasifikasi pupa <-> baby larva.

Menjalankan best.pt pada gambar uji dengan threshold SANGAT rendah (0.01)
lalu menampilkan semua deteksi mentah beserta confidence-nya, sehingga
terlihat: apakah model "salah yakin" (conf tinggi tapi kelas salah -> masalah
data/model) atau "ragu-ragu lalu salah pilih" (conf rendah -> masalah
threshold, bisa diperbaiki via YOLO_CLASS_CONF).

Pemakaian:
    py diagnose_conf.py path/ke/gambar.jpg [gambar2.jpg ...]
    py diagnose_conf.py path/ke/folder_gambar
    py diagnose_conf.py img.jpg --imgsz 640 1280      # bandingkan beberapa imgsz
    py diagnose_conf.py img.jpg --save                # simpan hasil anotasi

Hasil anotasi disimpan ke ./diagnose_out/ jika --save dipakai.
"""

import argparse
import os
import sys
from collections import defaultdict

from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")

# Tier threshold seperti di inference.py / kandidat nilai baru
TIERS = {
    "current (baby/prepupa/pupa=0.45, adult=0.55)": {0: 0.55, 1: 0.45, 2: 0.45, 3: 0.45},
    "previous (baby/prepupa/pupa=0.30, adult=0.55)": {0: 0.55, 1: 0.30, 2: 0.30, 3: 0.30},
    "calibrated v22 (adult=0.65, baby=0.45, prepupa=0.70, pupa=0.45)": {0: 0.65, 1: 0.45, 2: 0.70, 3: 0.45},
}

RAW_CONF = 0.01  # tampilkan hampir semua deteksi mentah


def cls_name(model, cls_id):
    return model.names.get(int(cls_id), str(cls_id))


def tier_label(model, cls_id):
    name = cls_name(model, cls_id).upper()
    if "BABY" in name:
        return "BABY"
    if "ADULT" in name:
        return "ADULT"
    if "PREPUPA" in name:
        return "PREPUPA"
    if "PUPA" in name:
        return "PUPA"
    return name


def run(model, image_path, imgsz, save_dir=None):
    results = model.predict(
        source=image_path, conf=RAW_CONF, iou=0.6, imgsz=imgsz,
        max_det=3000, verbose=False,
    )
    result = results[0]

    by_class = defaultdict(list)
    boxes = result.boxes
    n_raw = len(boxes) if boxes is not None else 0
    for i in range(n_raw):
        conf = float(boxes.conf[i])
        cls_id = int(boxes.cls[i])
        by_class[cls_id].append(conf)

    print(f"\n{'=' * 78}")
    print(f"Gambar : {image_path}")
    print(f"imgsz  : {imgsz} | deteksi mentah (conf>={RAW_CONF}): {n_raw}")

    if n_raw == 0:
        print("  -> tidak ada deteksi sama sekali. Coba imgsz lebih kecil/besar.")
        return

    for cls_id in sorted(by_class):
        confs = sorted(by_class[cls_id], reverse=True)
        top = ", ".join(f"{c:.2f}" for c in confs[:8])
        extra = f" (+{len(confs) - 8} lagi)" if len(confs) > 8 else ""
        print(f"  {tier_label(model, cls_id):8s} (id {cls_id}) x{len(confs):3d} | conf tertinggi: {top}{extra}")

    # Evaluasi tiap tier threshold
    for tier_name, thresholds in TIERS.items():
        counts = defaultdict(int)
        for cls_id, confs in by_class.items():
            for c in confs:
                if c >= thresholds.get(cls_id, 0.25):
                    counts[cls_id] += 1
        summary = ", ".join(
            f"{tier_label(model, cid)}={n}" for cid, n in sorted(counts.items())
        ) or "tidak ada yang lolos"
        print(f"  [{tier_name}] -> {summary}")

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        base = os.path.splitext(os.path.basename(image_path))[0]
        out = os.path.join(save_dir, f"{base}_imgsz{imgsz}.jpg")
        plotted = result.plot(line_width=2)
        import cv2
        cv2.imwrite(out, plotted)
        print(f"  -> anotasi disimpan: {out}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", nargs="+", help="file gambar atau folder")
    parser.add_argument("--imgsz", type=int, nargs="+", default=[1280], help="ukuran inferensi (bisa beberapa)")
    parser.add_argument("--save", action="store_true", help="simpan gambar beranotasi ke ./diagnose_out")
    args = parser.parse_args()

    if not os.path.exists(MODEL_PATH):
        sys.exit(f"best.pt tidak ditemukan di {MODEL_PATH}")

    model = YOLO(MODEL_PATH)
    print(f"Model : {MODEL_PATH}")
    print(f"Kelas : {model.names}")

    paths = []
    for p in args.images:
        if os.path.isdir(p):
            exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
            paths += [os.path.join(p, f) for f in sorted(os.listdir(p))
                      if os.path.splitext(f)[1].lower() in exts]
        else:
            paths.append(p)
    if not paths:
        sys.exit("Tidak ada gambar yang ditemukan.")

    save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diagnose_out") if args.save else None

    for path in paths:
        for imgsz in args.imgsz:
            run(model, path, imgsz, save_dir)


if __name__ == "__main__":
    main()
