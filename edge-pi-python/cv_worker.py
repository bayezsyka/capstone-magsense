import cv2
import sqlite3
import time
from ultralytics import YOLO

DB_FILE = "local_edge.db"
MODEL_FILE = "best.pt"

# Assuming classes are: 0: baby_larva, 1: adult_larva, 2: prepupa, 3: pupa
# If different, this should be adjusted based on the actual model.
CLASS_NAMES = ["baby_larva", "adult_larva", "prepupa", "pupa"]

def process_frame(model, frame):
    results = model(frame, verbose=False)
    counts = {
        "baby_larva": 0,
        "adult_larva": 0,
        "prepupa": 0,
        "pupa": 0
    }
    
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            if cls_id < len(CLASS_NAMES):
                cls_name = CLASS_NAMES[cls_id]
                counts[cls_name] += 1
                
    return counts

def save_to_db(box_id, counts):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO cv_data (box_id, baby_larva, adult_larva, prepupa, pupa)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        box_id,
        counts["baby_larva"],
        counts["adult_larva"],
        counts["prepupa"],
        counts["pupa"]
    ))
    conn.commit()
    conn.close()
    print(f"Saved CV data: {counts}")

def run_cv_worker():
    print(f"Loading YOLOv8 model from {MODEL_FILE}...")
    try:
        model = YOLO(MODEL_FILE)
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    # Use default camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Cannot open camera. Running in mock mode...")
        # Mock mode if camera is not available
        while True:
            mock_counts = {"baby_larva": 150, "adult_larva": 300, "prepupa": 50, "pupa": 10}
            save_to_db(1, mock_counts)
            time.sleep(10)
            
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame.")
                break
                
            counts = process_frame(model, frame)
            save_to_db(1, counts) # Defaulting to box_id = 1
            
            # Wait for 10 seconds before next capture to avoid filling DB too fast
            time.sleep(10)
    except KeyboardInterrupt:
        print("Stopping CV worker...")
    finally:
        cap.release()

if __name__ == "__main__":
    run_cv_worker()
