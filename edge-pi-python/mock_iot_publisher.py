import paho.mqtt.client as mqtt
import json
import time
import random
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [MOCK IoT] - %(message)s")

MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "maggot/sensor/data")
INTERVAL_SEC = int(os.environ.get("PUBLISH_INTERVAL_SEC", 5))

def run_mock_iot():
    client = mqtt.Client(client_id="ESP32_Mock_Publisher")
    
    connected = False
    while not connected:
        try:
            logging.info(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_start()
            connected = True
            logging.info("Connected to MQTT Broker successfully.")
        except Exception as e:
            logging.warning(f"Connection failed: {e}. Retrying in 3 seconds...")
            time.sleep(3)

    # Initial state
    temp = 29.2
    humidity = 71.5
    media_humidity = 58.0

    while True:
        try:
            # Smooth realistic random walk
            temp += random.uniform(-0.15, 0.15)
            temp = max(26.5, min(33.0, round(temp, 2)))

            humidity += random.uniform(-0.3, 0.3)
            humidity = max(60.0, min(85.0, round(humidity, 2)))

            media_humidity += random.uniform(-0.2, 0.2)
            media_humidity = max(45.0, min(75.0, round(media_humidity, 2)))

            # Raw soil moisture ADC simulation (12-bit ADC: inverted dry~3200, wet~1800)
            raw_soil_adc = int(3500 - (media_humidity / 100.0 * 2000))

            # Simulate onboard ESP32 microclimate logic
            heater_status = "ON" if temp < 27.5 else "OFF"
            kipas_status = "ON" if temp > 31.0 else "OFF"
            pompa_status = "ON" if media_humidity < 50.0 else "OFF"

            payload = {
                "box_id": 1,
                "temperature": temp,
                "humidity": humidity,
                "media_humidity": media_humidity,
                "raw_soil_adc": raw_soil_adc,
                "actuators": {
                    "heater": heater_status,
                    "kipas": kipas_status,
                    "pompa": pompa_status
                },
                "source": "mock",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }

            msg_str = json.dumps(payload)
            client.publish(MQTT_TOPIC, msg_str)
            logging.info(f"Published telemetry -> Temp: {temp}°C | RH: {humidity}% | Media: {media_humidity}% | Kipas: {kipas_status} | Heater: {heater_status}")

            time.sleep(INTERVAL_SEC)
        except Exception as e:
            logging.error(f"Error publishing mock IoT data: {e}")
            time.sleep(INTERVAL_SEC)

if __name__ == "__main__":
    run_mock_iot()
