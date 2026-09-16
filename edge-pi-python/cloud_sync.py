import sqlite3
import logging
import time
import requests
import json
import paho.mqtt.publish as publish

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = "edge_local.db"
import os
CLOUD_API_URL = os.environ.get("SYNC_URL", "http://edge-backend:5000/api/edge-sync")
EDGE_BACKEND_URL = os.environ.get("EDGE_BACKEND_URL", "http://edge-backend:5000")

def get_unsynced_data(table, columns):
    """
    Fetch unsynced rows from a given table.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        # Limit to 100 rows per batch to prevent large payload timeout
        cursor.execute(f"SELECT id, {','.join(columns)} FROM {table} WHERE synced = 0 ORDER BY timestamp ASC LIMIT 100")
        rows = cursor.fetchall()
        conn.close()
        
        # Format to list of dictionaries
        result = []
        for row in rows:
            record = {'id': row[0]}
            for idx, col in enumerate(columns):
                # Mapping sqlite names to postgres names
                if col == 'temperature':
                    record['air_temp'] = row[idx+1]
                elif col == 'humidity':
                    record['air_humidity'] = row[idx+1]
                elif col == 'actuator_type':
                    record['type'] = row[idx+1]
                else:
                    record[col] = row[idx+1]
            result.append(record)
        return result
    except sqlite3.Error as e:
        logging.error(f"Error fetching unsynced data from {table}: {e}")
        return []

def mark_as_synced(table, ids):
    """
    Mark rows as synced in the database.
    """
    if not ids: return
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        placeholders = ','.join('?' * len(ids))
        cursor.execute(f"UPDATE {table} SET synced = 1 WHERE id IN ({placeholders})", ids)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Error marking {table} as synced: {e}")

def cleanup_synced_data(days=7):
    """
    Delete rows that are synced and older than a specified number of days.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        tables_to_clean = ['sensor_data', 'actuator_logs', 'cv_results', 'harvest_predictions']
        for table in tables_to_clean:
            cursor.execute(f"DELETE FROM {table} WHERE synced = 1 AND timestamp < datetime('now', '-{days} days')")
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                logging.info(f"Cleaned up {deleted_count} old synced records from {table}")
                
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Error during cleanup: {e}")

def pull_thresholds():
    """
    HTTP GET to /api/automation-thresholds on backend.
    If success, update local SQLite and publish via MQTT to ESP32.
    """
    try:
        response = requests.get(f"{EDGE_BACKEND_URL}/api/automation-thresholds", timeout=10)
        if response.status_code == 200:
            thresholds = response.json()
            if thresholds and len(thresholds) > 0:
                # Ambil konfigurasi terbaru
                latest = thresholds[-1] 
                
                # Simpan ke SQLite edge_local.db
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO automation_thresholds 
                    (id, box_id, temp_min, temp_max, soil_min)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    1, # Default ID for simplicity on edge
                    1, # Default Box ID
                    latest.get('temp_min', 25.0),
                    latest.get('temp_max', 35.0),
                    latest.get('media_hum_min', 40.0) # Mapping media_hum_min to soil_min
                ))
                conn.commit()
                conn.close()
                
                # Format MQTT Payload untuk ESP32
                mqtt_payload = json.dumps({
                    "suhu_min": latest.get('temp_min', 25.0),
                    "suhu_max": latest.get('temp_max', 35.0),
                    "moisture_min": latest.get('media_hum_min', 40.0)
                })
                
                # Publish ke MQTT Broker lokal
                publish.single("maggot/kontrol/threshold", payload=mqtt_payload, hostname=os.environ.get("MQTT_BROKER", "mqtt-broker"))
                logging.info(f"Thresholds updated and published to MQTT: {mqtt_payload}")
                
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error pulling thresholds: {e}")
    except Exception as e:
        logging.error(f"Error processing thresholds: {e}")

def run_cloud_sync():
    logging.info("Starting Cloud Sync Worker...")
    
    # Define tables and their columns to sync (excluding id and synced flag)
    tables_to_sync = {
        'sensor_data': ['box_id', 'temperature', 'humidity', 'media_humidity', 'timestamp'],
        'actuator_logs': ['box_id', 'actuator_type', 'status', 'timestamp'],
        'cv_results': ['box_id', 'baby_larva', 'adult_larva', 'prepupa', 'pupa', 'dominant_phase', 'timestamp'],
        'harvest_predictions': ['box_id', 'predicted_days', 'confidence', 'timestamp']
    }
    
    while True:
        try:
            payload = {}
            ids_to_mark = {}
            
            # 1. Collect all unsynced data
            for table, columns in tables_to_sync.items():
                data = get_unsynced_data(table, columns)
                if data:
                    payload[table] = data
                    ids_to_mark[table] = [record['id'] for record in data]
            
            # 2. Send bulk data to Cloud if any exists
            if payload:
                logging.info(f"Syncing bulk data to cloud: {list(payload.keys())}")
                
                response = requests.post(CLOUD_API_URL, json=payload, timeout=15)
                
                # 3. Mark as synced if successful
                if response.status_code in [200, 201]:
                    for table, ids in ids_to_mark.items():
                        mark_as_synced(table, ids)
                    logging.info("Bulk sync successful!")
                else:
                    logging.error(f"Sync failed. Status: {response.status_code}, Resp: {response.text}")
                    
            # 4. Ambil aturan otomasi terbaru dari Cloud ke Edge
            pull_thresholds()
            
            # 5. Cleanup old synced data
            cleanup_synced_data(days=7)
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Network error during sync: {e}")
        except Exception as e:
            logging.error(f"Unexpected error during sync: {e}")
        
        # Wait before next sync cycle (e.g., every 30 seconds)
        time.sleep(30)

if __name__ == "__main__":
    run_cloud_sync()
