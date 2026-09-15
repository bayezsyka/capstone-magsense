import sqlite3
import logging
import time
import random

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = "edge_local.db"
MODEL_PATH = "xgb_model.pkl"

def load_xgboost_model():
    """
    Load XGBoost model from file. Using a mock for now as requested.
    """
    try:
        import xgboost as xgb
        # model = xgb.XGBRegressor()
        # model.load_model(MODEL_PATH)
        # return model
        return None
    except ImportError:
        logging.warning("xgboost library not installed. Running in mock mode.")
        return None

def get_latest_data(box_id):
    """
    Retrieve latest sensor and cv data for a specific box.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Get latest sensor
    cursor.execute('''
        SELECT temperature, humidity, media_humidity FROM sensor_data 
        WHERE box_id = ? ORDER BY timestamp DESC LIMIT 1
    ''', (box_id,))
    sensor = cursor.fetchone()
    
    # Get latest CV
    cursor.execute('''
        SELECT baby_larva, adult_larva, prepupa, pupa FROM cv_results 
        WHERE box_id = ? ORDER BY timestamp DESC LIMIT 1
    ''', (box_id,))
    cv = cursor.fetchone()
    
    conn.close()
    
    if sensor and cv:
        return {
            'temp': sensor[0], 'rh': sensor[1], 'media': sensor[2],
            'baby': cv[0], 'adult': cv[1], 'prepupa': cv[2], 'pupa': cv[3]
        }
    return None

def predict_harvest_days(features, model=None):
    """
    Predict days to harvest. Uses mock if model is None.
    """
    if model:
        # Format features into DMatrix or DataFrame and predict
        # input_data = [[features['temp'], features['rh'], features['adult'] ... ]]
        # return model.predict(input_data)[0]
        pass
        
    # Mock logic based on features
    # If adult larva is high, panen is close.
    total_maggot = features['baby'] + features['adult'] + features['prepupa']
    if features['prepupa'] > 20:
        return round(random.uniform(1.0, 3.0), 1)
    elif features['adult'] > 50:
        return round(random.uniform(4.0, 10.0), 1)
    else:
        return round(random.uniform(15.0, 24.0), 1)

def save_prediction(box_id, days, confidence=0.95):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO harvest_predictions (box_id, predicted_days, confidence)
            VALUES (?, ?, ?)
        ''', (box_id, days, confidence))
        conn.commit()
        conn.close()
        logging.info(f"Saved Prediction for Box {box_id}: {days} days to harvest.")
    except sqlite3.Error as e:
        logging.error(f"Database error saving prediction: {e}")

def run_ml_pipeline():
    logging.info("Starting ML Worker Pipeline...")
    model = load_xgboost_model()
    
    while True:
        try:
            for box_id in [1, 2, 3]:
                data = get_latest_data(box_id)
                if data:
                    days_predicted = predict_harvest_days(data, model)
                    save_prediction(box_id, days_predicted)
                else:
                    logging.debug(f"Not enough data for Box {box_id} to make prediction yet.")
                    
            # Run prediction every 5 minutes
            time.sleep(300)
        except Exception as e:
            logging.error(f"Error in ML pipeline loop: {e}")
            time.sleep(60)

if __name__ == "__main__":
    run_ml_pipeline()
