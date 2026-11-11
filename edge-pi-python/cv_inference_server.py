import base64
import io
import logging
import os
import time
from typing import Optional, Dict, Any, List

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import xgboost as xgb

from inference import predict

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [CV-SERVER] - %(message)s")
logger = logging.getLogger("cv_server")

app = FastAPI(title="MagSense CV/ML Inference Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "best.pt")
XGB_MODEL_PATH = os.path.join(BASE_DIR, "models", "model_xgboost_regressor.json")

logger.info(f"Loading YOLO model from: {YOLO_MODEL_PATH}")
yolo_model = YOLO(YOLO_MODEL_PATH)
logger.info(f"YOLO classes: {yolo_model.names}")

logger.info(f"Loading XGBoost model from: {XGB_MODEL_PATH}")
xgb_model = xgb.Booster()
xgb_model.load_model(XGB_MODEL_PATH)
logger.info("XGBoost model loaded successfully")

class ScanRequest(BaseModel):
    image: str
    box_id: Optional[str] = None
    sensor_data: Optional[Dict[str, float]] = None

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "yolo_loaded": yolo_model is not None,
        "xgboost_loaded": xgb_model is not None,
        "classes": yolo_model.names if yolo_model else {}
    }

@app.post("/scan")
async def scan_frame(payload: ScanRequest):
    try:
        raw_b64 = payload.image
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_b64)
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_w, img_h = pil_img.size
        img_np = np.array(pil_img)
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    t_start = time.time()
    detections, inference_mode = predict(yolo_model, img_np)
    infer_time_ms = round((time.time() - t_start) * 1000, 1)

    baby, adult, prepupa, pupa = 0, 0, 0, 0
    conf_scores: List[float] = []
    boxes_out = []
    phase_conf_sums: Dict[str, float] = {"baby_larva": 0.0, "adult_larva": 0.0, "prepupa": 0.0, "pupa": 0.0}
    phase_conf_counts: Dict[str, int] = {"baby_larva": 0, "adult_larva": 0, "prepupa": 0, "pupa": 0}
    phase_key_map = {"Baby Larva": "baby_larva", "Adult Larva": "adult_larva", "Prepupa": "prepupa", "Pupa": "pupa"}

    for detection in detections:
        cls_id = detection["class_id"]
        conf = detection["confidence"]
        conf_scores.append(conf)
        cls_name = yolo_model.names.get(cls_id, "").upper()

        if "BABY" in cls_name:
            baby += 1
            canonical_cls = "Baby Larva"
        elif "ADULT" in cls_name:
            adult += 1
            canonical_cls = "Adult Larva"
        elif "PREPUPA" in cls_name:
            prepupa += 1
            canonical_cls = "Prepupa"
        elif "PUPA" in cls_name:
            pupa += 1
            canonical_cls = "Pupa"
        else:
            canonical_cls = cls_name

        xyxy = detection["xyxy"]
        boxes_out.append({
            "x1": round(xyxy[0], 1),
            "y1": round(xyxy[1], 1),
            "x2": round(xyxy[2], 1),
            "y2": round(xyxy[3], 1),
            "confidence": round(conf, 3),
            "class_name": canonical_cls,
            "class_id": cls_id
        })

        phase_key = phase_key_map.get(canonical_cls)
        if phase_key:
            phase_conf_sums[phase_key] += conf
            phase_conf_counts[phase_key] += 1

    total_detected = baby + adult + prepupa + pupa
    stages = {"BABY LARVA": baby, "ADULT LARVA": adult, "PREPUPA": prepupa, "PUPA": pupa}
    dominant_phase = max(stages, key=stages.get) if total_detected > 0 else "ADULT LARVA"
    avg_conf = round(float(sum(conf_scores) / len(conf_scores)), 4) if conf_scores else 0.85

    phase_confidences = {
        key: round(float(phase_conf_sums[key] / phase_conf_counts[key]), 4) if phase_conf_counts[key] > 0 else None
        for key in phase_conf_sums
    }
    dominant_phase_key_map = {"BABY LARVA": "baby_larva", "ADULT LARVA": "adult_larva", "PREPUPA": "prepupa", "PUPA": "pupa"}
    dominant_phase_confidence = phase_confidences.get(dominant_phase_key_map.get(dominant_phase, ""))

    proportions = {
        "baby_larva": round(baby / total_detected, 4) if total_detected > 0 else 0.0,
        "adult_larva": round(adult / total_detected, 4) if total_detected > 0 else 0.0,
        "prepupa": round(prepupa / total_detected, 4) if total_detected > 0 else 0.0,
        "pupa": round(pupa / total_detected, 4) if total_detected > 0 else 0.0
    }

    sensor = payload.sensor_data or {}
    suhu = float(sensor.get("suhu_udara_c", 29.0))
    rh_udara = float(sensor.get("kelembapan_udara_pct", 70.0))
    rh_media = float(sensor.get("kelembapan_media_pct", 65.0))

    feature_names = [
        "suhu_udara_c", "kelembapan_udara_pct", "kelembapan_media_pct",
        "jumlah_baby_larva", "jumlah_adult_larva", "jumlah_prepupa", "jumlah_pupa"
    ]
    xgb_features = [[suhu, rh_udara, rh_media, float(baby), float(adult), float(prepupa), float(pupa)]]
    dmatrix = xgb.DMatrix(xgb_features, feature_names=feature_names)
    predicted_days = float(xgb_model.predict(dmatrix)[0])
    predicted_days = max(1.0, round(predicted_days, 1))

    if predicted_days <= 3.0:
        urgency_level = "High"
    elif predicted_days <= 7.0:
        urgency_level = "Medium"
    else:
        urgency_level = "Low"

    return {
        "success": True,
        "image_size": {"width": img_w, "height": img_h},
        "inference_ms": infer_time_ms,
        "inference_mode": inference_mode,
        "detection_counts": {
            "baby_larva": baby,
            "adult_larva": adult,
            "prepupa": prepupa,
            "pupa": pupa,
            "total_detected": total_detected
        },
        "dominant_phase": dominant_phase,
        "confidence_score": avg_conf,
        "phase_confidences": phase_confidences,
        "dominant_phase_confidence": dominant_phase_confidence,
        "proportions": proportions,
        "harvest_prediction": {
            "estimated_days": predicted_days,
            "urgency_level": urgency_level,
            "confidence": round(avg_conf * 100, 1)
        },
        "sensor_used": {
            "suhu_udara_c": suhu,
            "kelembapan_udara_pct": rh_udara,
            "kelembapan_media_pct": rh_media
        },
        "boxes": boxes_out,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
