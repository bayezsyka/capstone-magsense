import pandas as pd
import numpy as np
import xgboost as xgb
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_dummy_data(num_samples=1000):
    """
    Generate synthetic data for training the XGBoost model.
    Features: temperature, humidity, media_humidity, baby_larva, adult_larva, prepupa, pupa
    Target: estimasi_hari_panen
    """
    np.random.seed(42)
    
    # Generate random features
    temperature = np.random.uniform(25.0, 35.0, num_samples)
    humidity = np.random.uniform(50.0, 90.0, num_samples)
    media_humidity = np.random.uniform(40.0, 80.0, num_samples)
    baby_larva = np.random.randint(0, 100, num_samples)
    adult_larva = np.random.randint(0, 300, num_samples)
    prepupa = np.random.randint(0, 50, num_samples)
    pupa = np.random.randint(0, 20, num_samples)
    
    # Generate Target based on a synthetic logic
    # Ideal conditions reduce harvest days
    # More prepupa/pupa means closer to harvest (fewer days)
    estimasi_hari_panen = 20 - (temperature * 0.1) - (prepupa * 0.3) - (pupa * 0.5)
    
    # Add some noise
    estimasi_hari_panen += np.random.normal(0, 1.5, num_samples)
    
    # Ensure realistic bounds (0 to 20 days)
    estimasi_hari_panen = np.clip(estimasi_hari_panen, 0, 20)
    
    data = pd.DataFrame({
        'temperature': temperature,
        'humidity': humidity,
        'media_humidity': media_humidity,
        'baby_larva': baby_larva,
        'adult_larva': adult_larva,
        'prepupa': prepupa,
        'pupa': pupa,
        'estimasi_hari_panen': estimasi_hari_panen
    })
    
    return data

def train_and_save_model():
    logging.info("Generating dummy data...")
    df = generate_dummy_data()
    
    feature_cols = [
        'temperature', 'humidity', 'media_humidity', 
        'baby_larva', 'adult_larva', 'prepupa', 'pupa'
    ]
    
    X = df[feature_cols]
    y = df['estimasi_hari_panen']
    
    logging.info("Training XGBoost Regressor model...")
    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=200, learning_rate=0.05, max_depth=5)
    model.fit(X, y)
    
    model_path = 'xgboost_model.json'
    model.save_model(model_path)
    logging.info(f"Model successfully trained and saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
