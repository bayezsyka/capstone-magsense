import time
import json
import random
import paho.mqtt.publish as publish
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - SIMULATOR - %(message)s')

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_SENSOR = "maggot/sensor/data"
TOPIC_ACTUATOR = "maggot/actuator/status"

def run_simulator():
    logging.info(f"Starting ESP32 Hardware Simulator. Publishing to {MQTT_BROKER}:{MQTT_PORT}")
    
    while True:
        try:
            # Generate random realistic sensor data
            box_id = random.choice([1, 2, 3])
            temperature = round(random.uniform(25.0, 35.0), 2)
            humidity = round(random.uniform(60.0, 80.0), 2)
            media_humidity = round(random.uniform(40.0, 90.0), 2)
            
            sensor_payload = {
                "box_id": box_id,
                "temperature": temperature,
                "humidity": humidity,
                "media_humidity": media_humidity
            }
            
            # Generate random actuator status
            kipas_status = random.choice(["ON", "OFF"])
            lampu_status = random.choice(["ON", "OFF"])
            
            actuator_payload = {
                "box_id": box_id,
                "kipas": kipas_status,
                "lampu": lampu_status
            }
            
            # We can publish them together or separately. 
            # We'll publish sensor data to TOPIC_SENSOR.
            publish.single(TOPIC_SENSOR, payload=json.dumps(sensor_payload), hostname=MQTT_BROKER, port=MQTT_PORT)
            logging.info(f"Published Sensor: {sensor_payload}")
            
            # Publish actuator data to TOPIC_ACTUATOR.
            publish.single(TOPIC_ACTUATOR, payload=json.dumps(actuator_payload), hostname=MQTT_BROKER, port=MQTT_PORT)
            logging.info(f"Published Actuator: {actuator_payload}")
            
        except Exception as e:
            logging.error(f"Failed to publish data: {e}")
            
        # Wait 10 seconds before next publish
        time.sleep(10)

if __name__ == "__main__":
    run_simulator()
