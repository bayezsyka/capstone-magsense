import paho.mqtt.client as mqtt
import sqlite3
import json
import logging
import time
import os
import re
from datetime import datetime
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [MQTT WORKER] - %(message)s")

MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))
MQTT_TOPIC_SENSOR = os.environ.get("MQTT_TOPIC_SENSOR", "maggot/sensor/data")
DB_FILE = os.environ.get("SQLITE_DB_PATH", "edge_local.db")

def parse_box_id(raw_box):
    """
    Memetakan box_code (misal: MAG-01, BOX-1) atau raw box_id menjadi integer Box ID.
    """
    if raw_box is None:
        return 1
    if isinstance(raw_box, int):
        return raw_box
    val_str = str(raw_box).strip().upper()
    if val_str in ("MAG-01", "BOX-1", "BOX_1"):
        return 1
    if val_str in ("MAG-02", "BOX-2", "BOX_2"):
        return 2
    if val_str in ("MAG-03", "BOX-3", "BOX_3"):
        return 3
    m = re.search(r'\d+', val_str)
    if m:
        try:
            return int(m.group(0))
        except ValueError:
            pass
    return 1

def normalize_status(val):
    """
    Memetakan status relay (0, 1, '0', '1', True, False, 'ON', 'OFF') menjadi 'ON' atau 'OFF'.
    """
    if val is None:
        return "OFF"
    if isinstance(val, (int, float)):
        return "ON" if int(val) == 1 else "OFF"
    if isinstance(val, bool):
        return "ON" if val else "OFF"
    s = str(val).strip().upper()
    if s in ("1", "ON", "TRUE", "HIGH", "AKTIF"):
        return "ON"
    return "OFF"

def save_payload_to_db(data):
    try:
        # 1. Resolusi Box ID (Mendukung box_id numerik maupun box_code seperti 'MAG-01')
        raw_box = data.get("box_id") if "box_id" in data else (data.get("box_code") or data.get("device_id"))
        box_id = parse_box_id(raw_box)

        # 2. Resolusi Suhu & Kelembapan Udara (Mendukung temperature, temperature_internal, air_temp)
        temp = data.get("temperature")
        if temp is None:
            temp = data.get("temperature_internal")
        if temp is None:
            temp = data.get("air_temp", 0.0)
        try:
            temp = float(temp)
        except (ValueError, TypeError):
            temp = 0.0

        hum = data.get("humidity")
        if hum is None:
            hum = data.get("humidity_internal")
        if hum is None:
            hum = data.get("air_humidity", 0.0)
        try:
            hum = float(hum)
        except (ValueError, TypeError):
            hum = 0.0

        # 3. Resolusi Kelembapan Media (Hanya jika disediakan secara eksplisit, jangan mengarang persentase)
        media_hum = data.get("media_humidity")
        if media_hum is not None:
            try:
                media_hum = float(media_hum)
            except (ValueError, TypeError):
                media_hum = None
        else:
            media_hum = None

        # 4. Resolusi Raw ADC Tanah (Mendukung raw_soil_adc maupun soil_raw dari firmware fisik)
        raw_adc = data.get("raw_soil_adc") if "raw_soil_adc" in data else data.get("soil_raw")
        if raw_adc is not None:
            try:
                raw_adc = int(raw_adc)
            except (ValueError, TypeError):
                raw_adc = None
        else:
            raw_adc = None

        source = data.get("source", "real")
        ts = data.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))

        conn = get_db_connection()
        cursor = conn.cursor()

        # 5. Simpan pembacaan sensor ke SQLite
        cursor.execute("""
            INSERT INTO sensor_data (box_id, temperature, humidity, media_humidity, raw_soil_adc, source, timestamp, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (box_id, temp, hum, media_hum, raw_adc, source, ts))

        # 6. Resolusi Status Aktuator (Mendukung object 'actuators' maupun field datar: fan_intake, fan_exhaust, ptc_heater)
        actuators = {}

        # Format bersarang (firmware repositori)
        if isinstance(data.get("actuators"), dict):
            for act_name, act_val in data["actuators"].items():
                actuators[act_name] = normalize_status(act_val)

        # Format datar (firmware ESP32 fisik)
        if "fan_intake" in data or "intake" in data:
            val = data.get("fan_intake", data.get("intake"))
            norm = normalize_status(val)
            actuators["intake"] = norm
            actuators["fan_intake"] = norm

        if "fan_exhaust" in data or "exhaust" in data:
            val = data.get("fan_exhaust", data.get("exhaust"))
            norm = normalize_status(val)
            actuators["exhaust"] = norm
            actuators["fan_exhaust"] = norm

        if "ptc_heater" in data or "ptc" in data or "heater" in data:
            val = data.get("ptc_heater", data.get("ptc", data.get("heater")))
            norm = normalize_status(val)
            actuators["ptc"] = norm
            actuators["heater"] = norm

        # Alias 'kipas' untuk kompatibilitas dasbor umum
        if "kipas" not in actuators:
            is_fan_on = (actuators.get("intake") == "ON" or actuators.get("exhaust") == "ON" or
                         actuators.get("fan_intake") == "ON" or actuators.get("fan_exhaust") == "ON")
            actuators["kipas"] = "ON" if is_fan_on else "OFF"

        for act_type, act_status in actuators.items():
            cursor.execute("""
                INSERT INTO actuator_logs (box_id, actuator_type, status, source, timestamp, synced)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (box_id, act_type, act_status, source, ts))

        conn.commit()
        conn.close()
        logging.info(
            f"Saved IoT data Box {box_id}: T={temp}°C, RH={hum}%, "
            f"MediaHum={media_hum}, SoilADC={raw_adc}, Actuators={actuators}"
        )
    except Exception as e:
        logging.error(f"Error saving IoT payload to SQLite: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info(f"Connected to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_SENSOR)
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
