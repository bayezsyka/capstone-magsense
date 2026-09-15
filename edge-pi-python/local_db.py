import sqlite3
import os

DB_FILE = "edge_local.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Table for ESP32 Sensor Data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            temperature REAL,
            humidity REAL,
            media_humidity REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # Table for Actuator Logs (From ESP32 / Dashboard)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS actuator_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            actuator_type TEXT, -- 'heater', 'kipas', 'pompa'
            status TEXT, -- 'ON', 'OFF'
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # Table for YOLOv8 Computer Vision Data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cv_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            baby_larva INTEGER,
            adult_larva INTEGER,
            prepupa INTEGER,
            pupa INTEGER,
            dominant_phase TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # Table for XGBoost Predictions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS harvest_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            predicted_days REAL,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # Table for Automation Thresholds
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS automation_thresholds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            temp_min REAL,
            temp_max REAL,
            soil_min REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Database {DB_FILE} initialized successfully with tables: sensor_data, actuator_logs, cv_results, harvest_predictions, automation_thresholds.")

if __name__ == "__main__":
    init_db()
