import os
import time
import json
import logging
import random
from datetime import datetime
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [CV WORKER] - %(message)s")

MOCK_CV = os.environ.get("MOCK_CV", "false").lower() in ["true", "1", "yes"]
CV_INTERVAL_SEC = int(os.environ.get("CV_INTERVAL_SEC", 10))

def has_recent_real_cv(box_id=1, max_age_sec=30):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, source FROM cv_results 
            WHERE box_id = ? AND source = 'real'
            ORDER BY timestamp DESC LIMIT 1
        """, (box_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return False
        # SQLite stored UTC timestamp string
        dt = datetime.strptime(row["timestamp"], "%Y-%m-%d %H:%M:%S")
        age = (datetime.utcnow() - dt).total_seconds()
        return age <= max_age_sec
    except Exception as e:
        logging.warning(f"Error checking recent real CV: {e}")
        return False

def generate_mock_cv_metrics(box_id=1):
    baby = random.randint(10, 35)
    adult = random.randint(140, 240)
    prepupa = random.randint(15, 45)
    pupa = random.randint(1, 8)
    total = baby + adult + prepupa + pupa

    proportions = {
        "baby_larva": round(baby / total, 4) if total > 0 else 0,
        "adult_larva": round(adult / total, 4) if total > 0 else 0,
        "prepupa": round(prepupa / total, 4) if total > 0 else 0,
        "pupa": round(pupa / total, 4) if total > 0 else 0
    }

    stage_counts = {"BABY LARVA": baby, "ADULT LARVA": adult, "PREPUPA": prepupa, "PUPA": pupa}
    dominant_phase = max(stage_counts, key=stage_counts.get)
    confidence = round(random.uniform(0.93, 0.98), 2)

    return {
        "box_id": box_id,
        "baby_larva": baby,
        "adult_larva": adult,
        "prepupa": prepupa,
        "pupa": pupa,
        "total_detected": total,
        "dominant_phase": dominant_phase,
        "confidence_score": confidence,
        "proportions": json.dumps(proportions),
        "image_path": "",
        "source": "mock",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

def save_cv_results(metrics):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO cv_results (
                box_id, baby_larva, adult_larva, prepupa, pupa,
                total_detected, dominant_phase, confidence_score,
                proportions, image_path, source, timestamp, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            metrics["box_id"], metrics["baby_larva"], metrics["adult_larva"],
            metrics["prepupa"], metrics["pupa"], metrics["total_detected"],
            metrics["dominant_phase"], metrics["confidence_score"],
            metrics["proportions"], metrics["image_path"], metrics["source"],
            metrics["timestamp"]
        ))
        conn.commit()
        conn.close()
        logging.info(f"Saved Mock CV Results Box {metrics['box_id']}: Total={metrics['total_detected']} | Dominant={metrics['dominant_phase']} | Source={metrics['source']}")
    except Exception as e:
        logging.error(f"Error saving CV results to SQLite: {e}")

def run_cv_loop():
    init_db()
    logging.info("CV Worker started. Monitoring for real CV stream from WebRTC...")
    while True:
        try:
            if MOCK_CV:
                metrics = generate_mock_cv_metrics(box_id=1)
                save_cv_results(metrics)
            else:
                # If WebRTC pipeline is active, real CV is already persisted by webrtc_server.py
                if not has_recent_real_cv(box_id=1, max_age_sec=30):
                    logging.info("No active real CV stream detected in last 30s. Standby / waiting for camera...")
                else:
                    logging.debug("Real CV stream actively persisting from camera.")
            time.sleep(CV_INTERVAL_SEC)
        except Exception as e:
            logging.error(f"Error in CV worker loop: {e}")
            time.sleep(CV_INTERVAL_SEC)

if __name__ == "__main__":
    run_cv_loop()
