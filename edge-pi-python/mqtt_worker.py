import paho.mqtt.client as mqtt
import sqlite3
import json
import logging
import time

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MQTT_BROKER = "localhost" # Assuming Mosquitto is running locally on Pi
MQTT_PORT = 1883
MQTT_TOPIC_SENSOR = "maggot/sensor/data"
DB_FILE = "edge_local.db"

def save_sensor_data(data):
    try:
        box_id = data.get("box_id", 1)
        temp = data.get("temperature", 0.0)
        hum = data.get("humidity", 0.0)
        media_hum = data.get("media_humidity", 0.0)

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO sensor_data (box_id, temperature, humidity, media_humidity)
            VALUES (?, ?, ?, ?)
        ''', (box_id, temp, hum, media_hum))
        conn.commit()
        conn.close()
        logging.info(f"Saved sensor data for Box {box_id}: Temp={temp}, Hum={hum}, MediaHum={media_hum}")
    except sqlite3.Error as e:
        logging.error(f"Database error while saving sensor data: {e}")
    except Exception as e:
        logging.error(f"Unexpected error while saving sensor data: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info(f"Connected to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_SENSOR)
        logging.info(f"Subscribed to topic: {MQTT_TOPIC_SENSOR}")
    else:
        logging.error(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        logging.debug(f"Received message on {msg.topic}: {payload}")
        data = json.loads(payload)
        save_sensor_data(data)
    except json.JSONDecodeError:
        logging.error("Failed to decode JSON payload")
    except Exception as e:
        logging.error(f"Error processing message: {e}")

def on_disconnect(client, userdata, rc):
    logging.warning(f"Disconnected from MQTT Broker with return code {rc}")
    if rc != 0:
        logging.info("Unexpected disconnection. Auto-reconnecting...")

def start_mqtt_worker():
    client = mqtt.Client(client_id="Pi_Edge_MQTT_Worker")
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    # Configure auto-reconnect delays (min 1s, max 60s)
    client.reconnect_delay_set(min_delay=1, max_delay=60)

    connected = False
    while not connected:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            connected = True
        except ConnectionRefusedError:
            logging.warning("Connection refused by broker. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            logging.error(f"Connection error: {e}. Retrying in 5 seconds...")
            time.sleep(5)

    client.loop_forever()

if __name__ == "__main__":
    logging.info("Starting MQTT Worker...")
    start_mqtt_worker()
