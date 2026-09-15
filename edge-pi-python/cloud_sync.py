import sqlite3
import logging
import time
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = "edge_local.db"
CLOUD_API_URL = "http://localhost:5000/api/sync" # Update with actual backend URL in production

def get_unsynced_data(table, columns):
    """
    Fetch unsynced rows from a given table.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(f"SELECT id, {','.join(columns)} FROM {table} WHERE synced = 0")
    rows = cursor.fetchall()
    conn.close()
    
    # Format to list of dictionaries
    result = []
    for row in rows:
        record = {'id': row[0]}
        for idx, col in enumerate(columns):
            record[col] = row[idx+1]
        result.append(record)
    return result

def mark_as_synced(table, ids):
    """
    Mark rows as synced in the database.
    """
    if not ids: return
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    placeholders = ','.join('?' * len(ids))
    cursor.execute(f"UPDATE {table} SET synced = 1 WHERE id IN ({placeholders})", ids)
    conn.commit()
    conn.close()

def sync_table(table, columns, endpoint_suffix):
    """
    Generic function to sync a specific table.
    """
    data = get_unsynced_data(table, columns)
    if not data:
        return

    logging.info(f"Syncing {len(data)} records from {table} to cloud...")
    
    try:
        # Assuming batch POST endpoint
        response = requests.post(f"{CLOUD_API_URL}/{endpoint_suffix}", json={table: data}, timeout=10)
        
        if response.status_code == 200 or response.status_code == 201:
            ids_to_mark = [record['id'] for record in data]
            mark_as_synced(table, ids_to_mark)
            logging.info(f"Successfully synced and marked {len(ids_to_mark)} records for {table}.")
        else:
            logging.error(f"Failed to sync {table}. Status Code: {response.status_code}, Response: {response.text}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Network error syncing {table}: {e}")

def run_cloud_sync():
    logging.info("Starting Cloud Sync Worker...")
    
    # Define tables and their columns to sync (excluding id and synced flag)
    tables_to_sync = [
        ('sensor_data', ['box_id', 'temperature', 'humidity', 'media_humidity', 'timestamp'], 'sensors'),
        ('actuator_logs', ['box_id', 'actuator_type', 'status', 'timestamp'], 'actuators'),
        ('cv_results', ['box_id', 'baby_larva', 'adult_larva', 'prepupa', 'pupa', 'dominant_phase', 'timestamp'], 'cv'),
        ('harvest_predictions', ['box_id', 'predicted_days', 'confidence', 'timestamp'], 'predictions')
    ]
    
    while True:
        for table, columns, endpoint in tables_to_sync:
            try:
                sync_table(table, columns, endpoint)
            except Exception as e:
                logging.error(f"Unexpected error while syncing {table}: {e}")
        
        # Wait before next sync cycle (e.g., every 30 seconds)
        time.sleep(30)

if __name__ == "__main__":
    run_cloud_sync()
