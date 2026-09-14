-- Smart Farming Database Schema
-- init.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    box_id INTEGER NOT NULL,
    air_temp DECIMAL(5,2),
    air_humidity DECIMAL(5,2),
    media_humidity DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CV Detections table
CREATE TABLE IF NOT EXISTS cv_detections (
    id SERIAL PRIMARY KEY,
    box_id INTEGER NOT NULL,
    dominant_phase VARCHAR(100),
    detection_counts JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Harvest predictions table
CREATE TABLE IF NOT EXISTS harvest_predictions (
    id SERIAL PRIMARY KEY,
    box_id INTEGER NOT NULL,
    estimated_days DECIMAL(5,1),
    dominant_phase VARCHAR(100),
    detection_counts JSONB,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thresholds table
CREATE TABLE IF NOT EXISTS thresholds (
    id SERIAL PRIMARY KEY,
    floor_level INTEGER UNIQUE NOT NULL,
    temp_min DECIMAL(5,2) DEFAULT 25.0,
    temp_max DECIMAL(5,2) DEFAULT 35.0,
    media_hum_min DECIMAL(5,2) DEFAULT 40.0,
    media_hum_max DECIMAL(5,2) DEFAULT 65.0,
    air_hum_min DECIMAL(5,2) DEFAULT 60.0,
    air_hum_max DECIMAL(5,2) DEFAULT 85.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default user (password: REDACTED_PASSWORD)
-- bcrypt hash for 'REDACTED_PASSWORD' with 10 rounds
INSERT INTO users (email, password, username, role) VALUES
('admin@maggott.com', 'REDACTED_BCRYPT_HASH', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert default thresholds for floors 1-4
INSERT INTO thresholds (floor_level, temp_min, temp_max, media_hum_min, media_hum_max, air_hum_min, air_hum_max) VALUES
(1, 25.0, 35.0, 40.0, 65.0, 60.0, 85.0),
(2, 25.0, 35.0, 40.0, 65.0, 60.0, 85.0),
(3, 25.0, 35.0, 40.0, 65.0, 60.0, 85.0),
(4, 25.0, 35.0, 40.0, 65.0, 60.0, 85.0)
ON CONFLICT (floor_level) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_box_id ON sensor_data(box_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_cv_detections_box_id ON cv_detections(box_id);
CREATE INDEX IF NOT EXISTS idx_harvest_predictions_box_id ON harvest_predictions(box_id);
