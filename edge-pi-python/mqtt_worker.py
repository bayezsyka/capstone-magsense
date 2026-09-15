import paho.mqtt.client as mqtt
import sqlite3
import json
import os

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC = "maggot/sensor/data"
DB_FILE = "local_edge.db"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode('utf-8')
    print(f"Received message on {msg.topic}: {payload}")
    
    try:
        data = json.loads(payload)
        box_id = data.get("box_id", 1)
        temp = data.get("temperature", 0.0)
        hum = data.get("humidity", 0.0)
        media_hum = data.get("media_humidity", 0.0)

        # Save to SQLite
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sensor_data (box_id, temperature, humidity, media_humidity) VALUES (?, ?, ?, ?)",
            (box_id, temp, hum, media_hum)
        )
        conn.commit()
        conn.close()
        print("Saved to local database.")
    except Exception as e:
        print(f"Error processing message: {e}")

if __name__ == "__main__":
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()
    except Exception as e:
        print(f"Could not connect to MQTT broker: {e}")
