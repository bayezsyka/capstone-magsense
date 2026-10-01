import sqlite3
import os

DB_FILE = os.environ.get("SQLITE_DB_PATH", "edge_local.db")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Table for ESP32 Sensor Data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER DEFAULT 1,
            temperature REAL,
            humidity REAL,
            media_humidity REAL,
            raw_soil_adc INTEGER DEFAULT 0,
            source TEXT DEFAULT "real",
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # 2. Table for Actuator Logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS actuator_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER DEFAULT 1,
            actuator_type TEXT,
            status TEXT,
            source TEXT DEFAULT "real",
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # 3. Table for YOLOv8 Computer Vision Results
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cv_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER DEFAULT 1,
            baby_larva INTEGER DEFAULT 0,
            adult_larva INTEGER DEFAULT 0,
            prepupa INTEGER DEFAULT 0,
            pupa INTEGER DEFAULT 0,
            total_detected INTEGER DEFAULT 0,
            dominant_phase TEXT DEFAULT "UNKNOWN",
            confidence_score REAL DEFAULT 0.0,
            proportions TEXT DEFAULT "{}",
            image_path TEXT DEFAULT "",
            source TEXT DEFAULT "real",
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # 4. Table for XGBoost Predictions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS harvest_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER DEFAULT 1,
            predicted_days REAL,
            urgency_level TEXT DEFAULT "Low",
            confidence REAL DEFAULT 0.95,
            source TEXT DEFAULT "real",
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # 5. Table for Automation Thresholds
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS automation_thresholds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER DEFAULT 1,
            temp_min REAL DEFAULT 26.0,
            temp_max REAL DEFAULT 32.0,
            soil_min REAL DEFAULT 45.0,
            soil_max REAL DEFAULT 70.0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute("SELECT COUNT(*) FROM automation_thresholds")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO automation_thresholds (box_id, temp_min, temp_max, soil_min, soil_max)
            VALUES (1, 26.0, 32.0, 45.0, 70.0)
        ''')

    conn.commit()
    conn.close()
    print(f"[LOCAL DB] Initialized SQLite database {DB_FILE} successfully.")

if __name__ == "__main__":
    init_db()
