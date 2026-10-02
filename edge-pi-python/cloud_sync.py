import os
import time
import json
import logging
import requests
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [CLOUD SYNC] - %(message)s")

SYNC_URL = os.environ.get("SYNC_URL", "https://api-capstone.sangkolo.my.id/api/edge-sync")
SYNC_INTERVAL_SEC = int(os.environ.get("SYNC_INTERVAL_SEC", 10))

def get_unsynced_records(table_name, limit=50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?", (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def mark_records_synced(table_name, ids):
    if not ids:
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ",".join(["?"] * len(ids))
    cursor.execute(f"UPDATE {table_name} SET synced = 1 WHERE id IN ({placeholders})", ids)
    conn.commit()
    conn.close()

def run_sync_cycle():
    sensor_rows = get_unsynced_records("sensor_data", 50)
    cv_rows = get_unsynced_records("cv_results", 20)
    actuator_rows = get_unsynced_records("actuator_logs", 50)
    harvest_rows = get_unsynced_records("harvest_predictions", 20)

    total_unsynced = len(sensor_rows) + len(cv_rows) + len(actuator_rows) + len(harvest_rows)
    if total_unsynced == 0:
        return

    payload = {
        "sensor_data": [
            {
                "local_id": r["id"],
                "box_id": r["box_id"],
                "air_temp": r["temperature"],
                "air_humidity": r["humidity"],
                "media_humidity": r["media_humidity"],
                "raw_soil_adc": r.get("raw_soil_adc", 0),
                "source": r.get("source", "real"),
                "timestamp": r["timestamp"]
            } for r in sensor_rows
        ],
        "cv_results": [
            {
                "local_id": r["id"],
                "box_id": r["box_id"],
                "dominant_phase": r["dominant_phase"],
                "confidence_score": r["confidence_score"],
                "detection_counts": {
                    "baby_larva": r["baby_larva"],
                    "adult_larva": r["adult_larva"],
                    "prepupa": r["prepupa"],
                    "pupa": r["pupa"]
                },
                "proportions": json.loads(r["proportions"]) if r.get("proportions") else {},
                "source": r.get("source", "real"),
                "timestamp": r["timestamp"]
            } for r in cv_rows
        ],
        "actuator_logs": [
            {
                "local_id": r["id"],
                "box_id": r["box_id"],
                "type": r["actuator_type"],
                "status": r["status"],
                "source": r.get("source", "real"),
                "timestamp": r["timestamp"]
            } for r in actuator_rows
        ],
        "harvest_predictions": [
            {
                "local_id": r["id"],
                "box_id": r["box_id"],
                "predicted_days": r["predicted_days"],
                "urgency_level": r["urgency_level"],
                "confidence": r.get("confidence"),
                "source": r.get("source", "real"),
                "timestamp": r["timestamp"]
            } for r in harvest_rows
        ]
    }

    try:
        res = requests.post(SYNC_URL, json=payload, timeout=10)
        if res.status_code == 200:
            mark_records_synced("sensor_data", [r["id"] for r in sensor_rows])
            mark_records_synced("cv_results", [r["id"] for r in cv_rows])
            mark_records_synced("actuator_logs", [r["id"] for r in actuator_rows])
            mark_records_synced("harvest_predictions", [r["id"] for r in harvest_rows])
            logging.info(f"Sync Success -> Sent {len(sensor_rows)} sensors, {len(cv_rows)} CVs, {len(actuator_rows)} actuators, {len(harvest_rows)} predictions to Central Backend.")
        else:
            logging.warning(f"Central Backend returned HTTP {res.status_code}: {res.text}")
    except requests.exceptions.RequestException as e:
        logging.warning(f"Central Backend unreachable ({e}). Data remains safely stored in local SQLite.")

def run_sync_loop():
    init_db()
    while True:
        try:
            run_sync_cycle()
            time.sleep(SYNC_INTERVAL_SEC)
        except Exception as e:
            logging.error(f"Error in sync loop: {e}")
            time.sleep(SYNC_INTERVAL_SEC)

if __name__ == "__main__":
    run_sync_loop()
