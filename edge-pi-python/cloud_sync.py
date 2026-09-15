import sqlite3
import time
import requests
import os

DB_FILE = "local_edge.db"
# Target local backend API for syncing edge data
CLOUD_API_URL = os.getenv("CLOUD_API_URL", "http://localhost:5000/api/edge-sync")

def sync_table(cursor, table_name, endpoint):
    cursor.execute(f"SELECT * FROM {table_name} WHERE synced = 0")
    rows = cursor.fetchall()
    
    if not rows:
        return
        
    print(f"Found {len(rows)} unsynced records in {table_name}.")
    
    # Get column names
    column_names = [description[0] for description in cursor.description]
    
    synced_ids = []
    
    for row in rows:
        payload = dict(zip(column_names, row))
        try:
            # Assuming endpoint handles individual or bulk uploads. We do individual for simplicity.
            response = requests.post(f"{CLOUD_API_URL}/{endpoint}", json=payload, timeout=5)
            if response.status_code in [200, 201]:
                synced_ids.append(row[0]) # id is usually the first column
            else:
                print(f"Failed to sync record {row[0]}: HTTP {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Network error syncing {table_name}: {e}")
            break # Stop trying if network is down
            
    # Update synced status locally
    if synced_ids:
        cursor.execute(
            f"UPDATE {table_name} SET synced = 1 WHERE id IN ({','.join(['?']*len(synced_ids))})",
            synced_ids
        )
        print(f"Successfully synced and marked {len(synced_ids)} records in {table_name}.")

def run_cloud_sync():
    print(f"Starting cloud sync worker. Targeting {CLOUD_API_URL}...")
    
    while True:
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            # endpoints need to be implemented on the backend-express if they aren't already.
            sync_table(cursor, "sensor_data", "sensor")
            sync_table(cursor, "cv_data", "cv")
            sync_table(cursor, "ml_predictions", "ml")
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error during cloud sync: {e}")
            
        # Check every 30 seconds
        time.sleep(30)

if __name__ == "__main__":
    run_cloud_sync()
