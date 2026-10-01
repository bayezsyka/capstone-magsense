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

# Model paths to check
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "model_xgboost_regressor.json")
MODEL_FILE = os.environ.get("XGB_MODEL_PATH", DEFAULT_MODEL_PATH)
if not os.path.exists(MODEL_FILE):
    ALT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_xgboost_regressor.json")
    if os.path.exists(ALT_PATH):
        MODEL_FILE = ALT_PATH

PREDICT_INTERVAL_SEC = int(os.environ.get("PREDICT_INTERVAL_SEC", 15))

# Global booster / model instance
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

def get_latest_readings(box_id=1):
    """
    Retrieves latest valid records from sensor_data and cv_results without fake defaults.
    """
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

def validate_and_extract_features(sensor_row, cv_row):
    """
    Validates input contract for 7 exact XGBoost features:
    1. suhu_udara_c (float)
    2. kelembapan_udara_pct (float)
    3. kelembapan_media_pct (float)
    4. jumlah_baby_larva (int)
    5. jumlah_adult_larva (int)
    6. jumlah_prepupa (int)
    7. jumlah_pupa (int)

    Returns (features_dict, is_valid, error_reason)
    """
    if not sensor_row:
        return None, False, "Tabel sensor_data kosong untuk box_id ini"
    if not cv_row:
        return None, False, "Tabel cv_results kosong untuk box_id ini"

    # 1. Microclimate features
    temp = sensor_row["temperature"]
    hum = sensor_row["humidity"]
    media_hum = sensor_row["media_humidity"]

    if temp is None or math.isnan(temp):
        return None, False, "suhu_udara_c bernilai null/NaN"
    if hum is None or math.isnan(hum):
        return None, False, "kelembapan_udara_pct bernilai null/NaN"
    if media_hum is None or math.isnan(media_hum):
        return None, False, "kelembapan_media_pct bernilai null/NaN"

    # Range validations
    if not (-10.0 <= float(temp) <= 60.0):
        return None, False, f"suhu_udara_c di luar rentang valid: {temp}"
    if not (0.0 <= float(hum) <= 100.0):
        return None, False, f"kelembapan_udara_pct di luar rentang valid: {hum}"
    if not (0.0 <= float(media_hum) <= 100.0):
        return None, False, f"kelembapan_media_pct di luar rentang valid: {media_hum}"

    # 2. CV detection count features
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
    """
    Fallback domain heuristic if model is unreadable.
    """
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
    features, is_valid, error_reason = validate_and_extract_features(sensor_row, cv_row)

    if not is_valid:
        logging.warning(f"Prediction skipped for box_id {box_id}: {error_reason}")
        return None

    pred_days = None
    source = "xgboost"

    if loaded_model is not None:
        try:
            # Construct DataFrame with exact column order
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
            
            # Log raw prediction value
            logging.info(f"Raw XGBoost output: {raw_pred:.4f} days")
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

    # Determine Urgency Level based on predicted days
    if pred_days <= 3.0:
        urgency = "High"
    elif pred_days <= 7.0:
        urgency = "Medium"
    else:
        urgency = "Low"

    confidence = 0.95

    return {
        "box_id": box_id,
        "predicted_days": round(pred_days, 2),
        "urgency_level": urgency,
        "confidence": confidence,
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
