import paho.mqtt.client as mqtt
import sqlite3
import json
import logging
import time
import os
from datetime import datetime
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [MQTT WORKER] - %(message)s")

MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))
MQTT_TOPIC_SENSOR = os.environ.get("MQTT_TOPIC_SENSOR", "maggot/sensor/data")
DB_FILE = os.environ.get("SQLITE_DB_PATH", "edge_local.db")

def save_payload_to_db(data):
    try:
        box_id = data.get("box_id", 1)
        temp = data.get("temperature", data.get("air_temp", 0.0))
        hum = data.get("humidity", data.get("air_humidity", 0.0))
        media_hum = data.get("media_humidity", 0.0)
        raw_adc = data.get("raw_soil_adc", 0)
        source = data.get("source", "real")
        ts = data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))

        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Insert sensor readings
        cursor.execute("""
            INSERT INTO sensor_data (box_id, temperature, humidity, media_humidity, raw_soil_adc, source, timestamp, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (box_id, temp, hum, media_hum, raw_adc, source, ts))

        # 2. Insert actuator states if present
        actuators = data.get("actuators", {})
        for act_type, act_status in actuators.items():
            cursor.execute("""
                INSERT INTO actuator_logs (box_id, actuator_type, status, source, timestamp, synced)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (box_id, act_type, act_status, source, ts))

        conn.commit()
        conn.close()
        logging.info(f"Saved IoT data Box {box_id}: T={temp}°C, RH={hum}%, Media={media_hum}%, Actuators={actuators}")
    except Exception as e:
        logging.error(f"Error saving IoT payload to SQLite: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info(f"Connected to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_SENSOR)
        client.subscribe("maggot/sensor/#")
        logging.info(f"Subscribed to topic: {MQTT_TOPIC_SENSOR}")
    else:
        logging.error(f"Failed to connect to MQTT broker, return code: {rc}")

def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode("utf-8")
        data = json.loads(payload_str)
        save_payload_to_db(data)
    except Exception as e:
        logging.error(f"Failed to process MQTT message from {msg.topic}: {e}")

def start_mqtt_worker():
    init_db()
    client = mqtt.Client(client_id="Edge_Local_MQTT_Worker")
    client.on_connect = on_connect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    connected = False
    while not connected:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            connected = True
        except Exception as e:
            logging.warning(f"Connection to MQTT failed: {e}. Retrying in 4 seconds...")
            time.sleep(4)

    client.loop_forever()

if __name__ == "__main__":
    start_mqtt_worker()
