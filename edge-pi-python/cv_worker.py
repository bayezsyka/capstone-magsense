import os
import sqlite3
import logging
import time
import random # For mock processing if camera not available
import cv2
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = "edge_local.db"
MODEL_PATH = "best.pt"

# Initialize model globally if exists, else None
try:
    model = YOLO(MODEL_PATH)
    logging.info(f"Successfully loaded YOLOv8 model from {MODEL_PATH}")
except Exception as e:
    logging.warning(f"Could not load YOLOv8 model (best.pt might be missing): {e}. Will run in mock mode.")
    model = None

def get_dominant_phase(counts):
    """
    Returns the phase name with the highest count.
    """
    if sum(counts.values()) == 0:
        return "IDLE"
    return max(counts, key=counts.get)

def process_frame(frame, box_id=1):
    """
    Process a single frame to detect maggots and save to DB.
    """
    counts = {
        'BABY LARVA': 0,
        'ADULT LARVA': 0,
        'PREPUPA': 0,
        'PUPA': 0
    }
    
    is_mock = os.environ.get('MOCK_CV', 'False').lower() == 'true' or model is None or frame is None
    
    if not is_mock:
        try:
            # Resize frame to 640x640 to save CPU/GPU overhead
            frame = cv2.resize(frame, (640, 640))
                
            # Predict using YOLOv8
            results = model.predict(source=frame, save=False, verbose=False)
            
            # Count detected classes
            if results and len(results) > 0:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0].item())
                    # Assuming class indices map to specific stages, e.g.:
                    # 0: Baby Larva, 1: Adult Larva, 2: Prepupa, 3: Pupa
                    # (Adjust mapping based on your actual best.pt training labels)
                    class_name = results[0].names[cls_id].upper()
                    
                    if 'BABY' in class_name:
                        counts['BABY LARVA'] += 1
                    elif 'ADULT' in class_name:
                        counts['ADULT LARVA'] += 1
                    elif 'PREPUPA' in class_name:
                        counts['PREPUPA'] += 1
                    elif 'PUPA' in class_name:
                        counts['PUPA'] += 1
                    else:
                        # Fallback mapping if names match exactly
                        if class_name in counts:
                            counts[class_name] += 1
        except Exception as e:
            logging.error(f"Error during YOLO prediction: {e}")
    else:
        # Mock processing
        counts['BABY LARVA'] = random.randint(0, 50)
        counts['ADULT LARVA'] = random.randint(20, 200)
        counts['PREPUPA'] = random.randint(0, 30)
        counts['PUPA'] = random.randint(0, 10)

    dominant = get_dominant_phase(counts)
    
    save_cv_results(box_id, counts['BABY LARVA'], counts['ADULT LARVA'], counts['PREPUPA'], counts['PUPA'], dominant)
    return counts, dominant

def save_cv_results(box_id, baby, adult, prepupa, pupa, dominant):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO cv_results (box_id, baby_larva, adult_larva, prepupa, pupa, dominant_phase)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (box_id, baby, adult, prepupa, pupa, dominant))
        conn.commit()
        conn.close()
        logging.info(f"Saved CV result for Box {box_id}: Dominant={dominant} (Baby:{baby}, Adult:{adult}, Pre:{prepupa}, Pupa:{pupa})")
    except sqlite3.Error as e:
        logging.error(f"Database error saving CV results: {e}")

def run_camera_loop():
    """
    Main loop to capture frames from camera periodically.
    """
    logging.info("Starting CV Worker Camera Loop...")
    # Open default camera (index 0). Change if using external USB cam.
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        logging.warning("No camera detected! Running in pure mock mode generating synthetic data every 60s.")
        while True:
            process_frame(None, box_id=1)
            process_frame(None, box_id=2)
            process_frame(None, box_id=3)
            time.sleep(60)
            
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logging.error("Failed to grab frame from camera.")
                time.sleep(5)
                continue
            
            # Process the live frame for Box 1 (assuming camera is pointing to box 1)
            process_frame(frame, box_id=1)
            
            # Wait for next cycle (e.g., process one frame every 60 seconds to save power)
            time.sleep(60)
    except KeyboardInterrupt:
        logging.info("CV Worker stopped by user.")
    except Exception as e:
        logging.error(f"CV Worker encountered a fatal error: {e}")
    finally:
        if cap and cap.isOpened():
            cap.release()
            logging.info("Camera released cleanly.")

if __name__ == "__main__":
    run_camera_loop()
