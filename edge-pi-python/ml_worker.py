import sqlite3
import logging
import time
import random
import os
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_FILE = "edge_local.db"
MODEL_FILE = "xgboost_model.json"

def fallback_prediction(features):
    """
    Fallback dummy prediction logic if XGBoost is missing or fails.
    """
    temp = features.get('temp', 28.0)
    prepupa = features.get('prepupa', 0)
    adult = features.get('adult', 0)
    
    if prepupa > 20:
        return round(random.uniform(1.0, 3.0), 1)
    elif adult > 50:
        return round(random.uniform(4.0, 10.0), 1)
        
    val = max(0.0, min(15.0, 15 - (temp * 0.1) - (prepupa * 0.3)))
    return round(val, 1)

def predict_harvest_days(box_id, model):
    """
    Predict for the given box using the pre-trained XGBoost model.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        
        # Query the latest data for this specific box
        query = """
            SELECT 
                s.temperature, s.humidity, s.media_humidity,
                c.baby_larva, c.adult_larva, c.prepupa, c.pupa
            FROM sensor_data s
            LEFT JOIN cv_results c ON s.box_id = c.box_id 
            WHERE s.box_id = ? AND s.temperature IS NOT NULL
            ORDER BY s.timestamp DESC
            LIMIT 1
        """
        df = pd.read_sql_query(query, conn, params=(box_id,))
        conn.close()
        
        if df.empty:
            logging.warning(f"No recent data for Box {box_id}. Using fallback.")
            return fallback_prediction({'temp': 28.0, 'prepupa': 0})
            
        df.fillna(0, inplace=True)
        
        feature_cols = [
            'temperature', 'humidity', 'media_humidity', 
            'baby_larva', 'adult_larva', 'prepupa', 'pupa'
        ]
        X_latest = df[feature_cols]
        
        if model is not None:
            prediction = model.predict(X_latest)[0]
            return round(float(prediction), 1)
        else:
            # If model wasn't loaded, use fallback based on actual latest data
            return fallback_prediction({
                'temp': df['temperature'].iloc[0], 
                'prepupa': df['prepupa'].iloc[0],
                'adult': df['adult_larva'].iloc[0]
            })
            
    except Exception as e:
        logging.error(f"Error predicting for Box {box_id}: {e}. Using fallback.")
        return fallback_prediction({'temp': 28.0, 'prepupa': 0})

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
    
    # Load model once at startup
    model = None
    try:
        import xgboost as xgb
        if os.path.exists(MODEL_FILE):
            model = xgb.XGBRegressor()
            model.load_model(MODEL_FILE)
            logging.info(f"Successfully loaded pre-trained model from {MODEL_FILE}")
        else:
            logging.warning(f"Model file {MODEL_FILE} not found. Please run train_xgb.py first. Using fallback.")
    except ImportError:
        logging.warning("XGBoost library not installed. Using fallback.")
    except Exception as e:
        logging.error(f"Error loading XGBoost model: {e}")

    while True:
        try:
            for box_id in [1, 2, 3]:
                days_predicted = predict_harvest_days(box_id, model)
                save_prediction(box_id, days_predicted)
                    
            # Run prediction every 5 minutes
            time.sleep(300)
        except Exception as e:
            logging.error(f"Error in ML pipeline loop: {e}")
            time.sleep(60)

if __name__ == "__main__":
    run_ml_pipeline()
