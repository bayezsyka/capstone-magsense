import sqlite3
import time
import os
import random
import numpy as np

# We would normally import xgboost:
# import xgboost as xgb

DB_FILE = "local_edge.db"
MODEL_FILE = "xgboost_model.pkl"

class MockXGBoost:
    """Mock XGBoost Regressor to simulate predictions."""
    def predict(self, features):
        # features: [temp, humidity, prop_baby, prop_adult, prop_prepupa, prop_pupa]
        # Basic mock logic: more adults/prepupa -> fewer days to harvest.
        temp = features[0][0]
        prop_adult = features[0][3]
        prop_prepupa = features[0][4]
        
        # Ideal temp is around 30C. 
        # Base days = 14
        base_days = 14.0
        
        if prop_prepupa > 0.3:
            return [max(1.0, 3.0 - (prop_prepupa * 2))]
        elif prop_adult > 0.5:
            return [max(3.0, 7.0 - (prop_adult * 5))]
        else:
            return [base_days + random.uniform(-1, 1)]

def get_latest_data(box_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Get latest sensor data
    cursor.execute('''
        SELECT temperature, humidity, media_humidity 
        FROM sensor_data 
        WHERE box_id = ? 
        ORDER BY timestamp DESC LIMIT 1
    ''', (box_id,))
    sensor_row = cursor.fetchone()
    
    # Get latest cv data
    cursor.execute('''
        SELECT baby_larva, adult_larva, prepupa, pupa 
        FROM cv_data 
        WHERE box_id = ? 
        ORDER BY timestamp DESC LIMIT 1
    ''', (box_id,))
    cv_row = cursor.fetchone()
    
    conn.close()
    return sensor_row, cv_row

def save_prediction(box_id, days):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO ml_predictions (box_id, harvest_days_predicted)
        VALUES (?, ?)
    ''', (box_id, float(days)))
    conn.commit()
    conn.close()
    print(f"Saved prediction: {days:.2f} days for Box #{box_id}")

def run_ml_worker():
    print(f"Loading XGBoost model from {MODEL_FILE} (using mock for now)...")
    # In real scenario: model = xgb.XGBRegressor(); model.load_model(MODEL_FILE)
    model = MockXGBoost()
    
    while True:
        try:
            # Assuming we monitor box_id 1
            box_id = 1
            sensor_data, cv_data = get_latest_data(box_id)
            
            if sensor_data and cv_data:
                temp, hum, media_hum = sensor_data
                baby, adult, prepupa, pupa = cv_data
                
                total_larva = baby + adult + prepupa + pupa
                if total_larva > 0:
                    prop_baby = baby / total_larva
                    prop_adult = adult / total_larva
                    prop_prepupa = prepupa / total_larva
                    prop_pupa = pupa / total_larva
                    
                    features = np.array([[temp, hum, media_hum, prop_baby, prop_adult, prop_prepupa, prop_pupa]])
                    prediction = model.predict(features)
                    
                    save_prediction(box_id, prediction[0])
                else:
                    print("No larva detected. Skipping prediction.")
            else:
                print("Waiting for enough sensor/cv data to make predictions...")
                
        except Exception as e:
            print(f"Error in ML worker: {e}")
            
        # Run every 60 seconds
        time.sleep(60)

if __name__ == "__main__":
    run_ml_worker()
