import os
import sys
import time
import json
import logging
import math
from datetime import datetime
import pandas as pd
import xgboost as xgb
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [ML XGBOOST] - %(message)s")

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "model_xgboost_regressor.json")
MODEL_FILE = os.environ.get("XGB_MODEL_PATH", DEFAULT_MODEL_PATH)
if not os.path.exists(MODEL_FILE):
    ALT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_xgboost_regressor.json")
    if os.path.exists(ALT_PATH):
        MODEL_FILE = ALT_PATH

PREDICT_INTERVAL_SEC = int(os.environ.get("PREDICT_INTERVAL_SEC", 15))

# Configurable Freshness Thresholds (in seconds)
MAX_SENSOR_AGE_SEC = float(os.environ.get("MAX_SENSOR_AGE_SEC", 60.0))
MAX_CV_AGE_SEC = float(os.environ.get("MAX_CV_AGE_SEC", 120.0))
MAX_PAIR_DELTA_SEC = float(os.environ.get("MAX_PAIR_DELTA_SEC", 90.0))

loaded_model = None

def load_xgboost_model():
    global loaded_model
    if not os.path.exists(MODEL_FILE):
        logging.error(f"XGBoost model file not found at {MODEL_FILE}")
        return None
    try:
        model = xgb.Booster()
        model.load_model(MODEL_FILE)
        logging.info(f"Loaded XGBoost model successfully from {MODEL_FILE}")
        logging.info(f"Model feature names: {model.feature_names}")
        loaded_model = model
        return loaded_model
    except Exception as e:
        logging.error(f"Failed to load XGBoost model from {MODEL_FILE}: {e}")
        return None

def parse_sqlite_timestamp(ts_val):
    if not ts_val:
        return None
    try:
        # Check standard format
        if "T" in str(ts_val):
            return datetime.fromisoformat(str(ts_val).replace("Z", ""))
        return datetime.strptime(str(ts_val), "%Y-%m-%d %H:%M:%S")
    except Exception as e:
        logging.warning(f"Failed to parse timestamp '{ts_val}': {e}")
        return None

def get_latest_readings(box_id=1):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT temperature, humidity, media_humidity, raw_soil_adc, source, timestamp 
        FROM sensor_data 
        WHERE box_id = ? 
        ORDER BY timestamp DESC LIMIT 1
    """, (box_id,))
    sensor_row = cursor.fetchone()

    cursor.execute("""
        SELECT baby_larva, adult_larva, prepupa, pupa, total_detected, dominant_phase, source, timestamp
        FROM cv_results 
        WHERE box_id = ? 
        ORDER BY timestamp DESC LIMIT 1
    """, (box_id,))
    cv_row = cursor.fetchone()
    conn.close()

    return sensor_row, cv_row

def check_freshness(sensor_row, cv_row):
    """
    Validates freshness and temporal proximity between IoT telemetry and CV detection.
    """
    if not sensor_row or not cv_row:
        return False, "Data sensor_data atau cv_results belum tersedia"

    sensor_dt = parse_sqlite_timestamp(sensor_row["timestamp"])
    cv_dt = parse_sqlite_timestamp(cv_row["timestamp"])

    if not sensor_dt or not cv_dt:
        return False, "Format timestamp pada record tidak valid"

    now = datetime.utcnow()
    sensor_age = (now - sensor_dt).total_seconds()
    cv_age = (now - cv_dt).total_seconds()
    pair_delta = abs((sensor_dt - cv_dt).total_seconds())

    if sensor_age > MAX_SENSOR_AGE_SEC:
        return False, f"sensor_data stale (age: {sensor_age:.1f}s > max {MAX_SENSOR_AGE_SEC}s)"
    if cv_age > MAX_CV_AGE_SEC:
        return False, f"cv_results stale (age: {cv_age:.1f}s > max {MAX_CV_AGE_SEC}s)"
    if pair_delta > MAX_PAIR_DELTA_SEC:
        return False, f"stale IoT/CV pair (delta: {pair_delta:.1f}s > max {MAX_PAIR_DELTA_SEC}s)"

    return True, None

def validate_and_extract_features(sensor_row, cv_row):
    temp = sensor_row["temperature"]
    hum = sensor_row["humidity"]
    media_hum = sensor_row["media_humidity"]

    if temp is None or math.isnan(temp):
        return None, False, "suhu_udara_c bernilai null/NaN"
    if hum is None or math.isnan(hum):
        return None, False, "kelembapan_udara_pct bernilai null/NaN"
    if media_hum is None or math.isnan(media_hum):
        return None, False, "kelembapan_media_pct bernilai null/NaN"

    if not (-10.0 <= float(temp) <= 60.0):
        return None, False, f"suhu_udara_c di luar rentang valid: {temp}"
    if not (0.0 <= float(hum) <= 100.0):
        return None, False, f"kelembapan_udara_pct di luar rentang valid: {hum}"
    if not (0.0 <= float(media_hum) <= 100.0):
        return None, False, f"kelembapan_media_pct di luar rentang valid: {media_hum}"

    baby = cv_row["baby_larva"]
    adult = cv_row["adult_larva"]
    prepupa = cv_row["prepupa"]
    pupa = cv_row["pupa"]

    if baby is None or math.isnan(baby) or int(baby) < 0:
        return None, False, f"jumlah_baby_larva tidak valid: {baby}"
    if adult is None or math.isnan(adult) or int(adult) < 0:
        return None, False, f"jumlah_adult_larva tidak valid: {adult}"
    if prepupa is None or math.isnan(prepupa) or int(prepupa) < 0:
        return None, False, f"jumlah_prepupa tidak valid: {prepupa}"
    if pupa is None or math.isnan(pupa) or int(pupa) < 0:
        return None, False, f"jumlah_pupa tidak valid: {pupa}"

    features = {
        "suhu_udara_c": float(temp),
        "kelembapan_udara_pct": float(hum),
        "kelembapan_media_pct": float(media_hum),
        "jumlah_baby_larva": int(baby),
        "jumlah_adult_larva": int(adult),
        "jumlah_prepupa": int(prepupa),
        "jumlah_pupa": int(pupa)
    }

    return features, True, None

def calculate_domain_estimate_fallback(f):
    total_larvae = f["jumlah_baby_larva"] + f["jumlah_adult_larva"] + f["jumlah_prepupa"] + f["jumlah_pupa"]
    prepupa_ratio = (f["jumlah_prepupa"] + f["jumlah_pupa"]) / total_larvae if total_larvae > 0 else 0.15
    temp_factor = (f["suhu_udara_c"] - 28.0) * 0.2
    base_days = 16.0 - (prepupa_ratio * 15.0) - temp_factor
    return round(max(1.0, min(20.0, base_days)), 2)

def predict_harvest(box_id=1):
    global loaded_model
    if loaded_model is None:
        load_xgboost_model()

    sensor_row, cv_row = get_latest_readings(box_id)
    
    # 1. Freshness check
    is_fresh, stale_reason = check_freshness(sensor_row, cv_row)
    if not is_fresh:
        logging.warning(f"prediction skipped: {stale_reason}")
        return None

    # 2. Value validation
    features, is_valid, error_reason = validate_and_extract_features(sensor_row, cv_row)
    if not is_valid:
        logging.warning(f"prediction skipped for box_id {box_id}: {error_reason}")
        return None

    pred_days = None
    source = "xgboost"

    if loaded_model is not None:
        try:
            feature_order = [
                "suhu_udara_c",
                "kelembapan_udara_pct",
                "kelembapan_media_pct",
                "jumlah_baby_larva",
                "jumlah_adult_larva",
                "jumlah_prepupa",
                "jumlah_pupa"
            ]
            df = pd.DataFrame([features])[feature_order]
            dmatrix = xgb.DMatrix(df)
            raw_pred = float(loaded_model.predict(dmatrix)[0])
            logging.info(f"Raw XGBoost output: {raw_pred:.4f} days (CV Source: {cv_row['source']})")
            pred_days = raw_pred
            source = "xgboost"
        except Exception as e:
            logging.error(f"XGBoost inference error: {e}. Falling back to domain estimate.")
            pred_days = calculate_domain_estimate_fallback(features)
            source = "modular_rule"
    else:
        logging.warning("XGBoost model is not loaded. Using fallback modular rule.")
        pred_days = calculate_domain_estimate_fallback(features)
        source = "modular_rule"

    if pred_days <= 3.0:
        urgency = "High"
    elif pred_days <= 7.0:
        urgency = "Medium"
    else:
        urgency = "Low"

    # NO FAKE CONFIDENCE FOR REGRESSOR: Use None / Null
    return {
        "box_id": box_id,
        "predicted_days": round(pred_days, 2),
        "urgency_level": urgency,
        "confidence": None,
        "source": source,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "features": features
    }

def save_prediction(pred):
    if not pred:
        return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO harvest_predictions (
                box_id, predicted_days, urgency_level, confidence, source, timestamp, synced
            ) VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (
            pred["box_id"], pred["predicted_days"], pred["urgency_level"],
            pred["confidence"], pred["source"], pred["timestamp"]
        ))
        conn.commit()
        conn.close()
        logging.info(f"Saved Harvest Prediction Box {pred['box_id']}: {pred['predicted_days']} hari | Urgency: {pred['urgency_level']} | Source: {pred['source']}")
    except Exception as e:
        logging.error(f"Error saving prediction to SQLite: {e}")

def run_ml_loop():
    init_db()
    load_xgboost_model()
    while True:
        try:
            pred = predict_harvest(box_id=1)
            if pred:
                save_prediction(pred)
            time.sleep(PREDICT_INTERVAL_SEC)
        except Exception as e:
            logging.error(f"Error in ML prediction loop: {e}")
            time.sleep(PREDICT_INTERVAL_SEC)

if __name__ == "__main__":
    run_ml_loop()
