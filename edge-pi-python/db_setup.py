import sqlite3
import os

DB_FILE = "local_edge.db"

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

    # Table for YOLOv8 Computer Vision Data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cv_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            baby_larva INTEGER,
            adult_larva INTEGER,
            prepupa INTEGER,
            pupa INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    # Table for XGBoost Predictions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ml_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            harvest_days_predicted REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Database {DB_FILE} initialized successfully.")

if __name__ == "__main__":
    init_db()
