"""Layanan prediksi hari_menuju_panen (XGBoost) untuk Raspberry Pi.

- HTTP : POST /predict  (dipanggil Express)    GET /health
- MQTT : opsional (MQTT_ENABLED=true) - subscribe MQTT_TOPIC_IN, publish MQTT_TOPIC_OUT
"""
import json
import logging
import os
import sqlite3
import threading
from contextlib import asynccontextmanager, closing
from datetime import datetime, timezone

import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field, ValidationError
from xgboost import XGBRegressor

# Urutan ini HARUS sama dengan FITUR saat training di Colab
FITUR = ["suhu_udara_c", "kelembapan_udara_pct", "kelembapan_media_adc",
         "jumlah_baby_larva", "jumlah_adult_larva", "jumlah_prepupa", "jumlah_pupa"]

MODEL_PATH = os.getenv("MODEL_PATH", "/app/model/harvest.json")
DB_PATH = os.getenv("DB_PATH", "/data/prediksi.db")  # kosongkan untuk mematikan pencatatan

MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() == "true"
MQTT_HOST = os.getenv("MQTT_HOST", "host.docker.internal")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "")
MQTT_PASS = os.getenv("MQTT_PASS", "")
MQTT_TOPIC_IN = os.getenv("MQTT_TOPIC_IN", "maggot/fitur")
MQTT_TOPIC_OUT = os.getenv("MQTT_TOPIC_OUT", "maggot/prediksi")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ml-panen")


# ---------- Model ----------
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"File model tidak ditemukan: {MODEL_PATH}. Taruh harvest.json di folder model/.")
model = XGBRegressor()
model.load_model(MODEL_PATH)
_nama = model.get_booster().feature_names
if _nama is not None and list(_nama) != FITUR:
    raise RuntimeError(f"Nama/urutan fitur model {list(_nama)} tidak sama dengan FITUR {FITUR}")
_lock = threading.Lock()


# ---------- Validasi input (sesuaikan rentang dengan data sensor/dataset-mu) ----------
class Fitur(BaseModel):
    suhu_udara_c: float = Field(ge=0, le=60, allow_inf_nan=False)
    kelembapan_udara_pct: float = Field(ge=0, le=100, allow_inf_nan=False)
    kelembapan_media_adc: float = Field(ge=0, le=4095, allow_inf_nan=False)  # ADC ESP32 12-bit
    jumlah_baby_larva: float = Field(ge=0, allow_inf_nan=False)
    jumlah_adult_larva: float = Field(ge=0, allow_inf_nan=False)
    jumlah_prepupa: float = Field(ge=0, allow_inf_nan=False)
    jumlah_pupa: float = Field(ge=0, allow_inf_nan=False)


# ---------- Pencatatan SQLite (bahan retraining) ----------
def init_db():
    if not DB_PATH:
        return
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    kolom = ", ".join(f"{c} REAL" for c in FITUR)
    with closing(sqlite3.connect(DB_PATH, timeout=5)) as c, c:
        c.execute(f"CREATE TABLE IF NOT EXISTS prediksi (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                  f"waktu TEXT, sumber TEXT, {kolom}, prediksi REAL, hari_menuju_panen_aktual REAL)")


def catat(f: Fitur, hari: float, sumber: str):
    if not DB_PATH:
        return
    try:
        nilai = [getattr(f, c) for c in FITUR]
        with closing(sqlite3.connect(DB_PATH, timeout=5)) as c, c:
            c.execute(f"INSERT INTO prediksi (waktu, sumber, {', '.join(FITUR)}, prediksi) "
                      f"VALUES (?, ?, {', '.join('?' * len(FITUR))}, ?)",
                      [datetime.now(timezone.utc).isoformat(), sumber, *nilai, hari])
    except Exception:
        log.exception("Gagal mencatat ke SQLite (prediksi tetap dikembalikan)")


def hitung(f: Fitur, sumber: str) -> float:
    df = pd.DataFrame([f.model_dump()])[FITUR]
    with _lock:
        hari = float(model.predict(df)[0])
    hari = round(max(hari, 0.0), 1)
    catat(f, hari, sumber)
    return hari


# ---------- MQTT (opsional) ----------
def mulai_mqtt():
    import paho.mqtt.client as mqtt

    c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ml-panen")
    if MQTT_USER:
        c.username_pw_set(MQTT_USER, MQTT_PASS)

    def on_connect(client, userdata, flags, reason_code, properties):
        log.info("MQTT terhubung (%s); subscribe %s", reason_code, MQTT_TOPIC_IN)
        client.subscribe(MQTT_TOPIC_IN, qos=1)

    def on_message(client, userdata, msg):
        try:
            f = Fitur.model_validate_json(msg.payload)
            hari = hitung(f, "mqtt")
            client.publish(MQTT_TOPIC_OUT, json.dumps(
                {"hari_menuju_panen": hari, "waktu": datetime.now(timezone.utc).isoformat()}),
                qos=1, retain=True)
        except ValidationError as e:
            log.warning("Payload MQTT ditolak: %s", e.errors(include_url=False))
        except Exception:
            log.exception("Gagal memproses pesan MQTT")

    c.on_connect, c.on_message = on_connect, on_message
    c.reconnect_delay_set(1, 30)
    c.connect_async(MQTT_HOST, MQTT_PORT, keepalive=60)  # tetap mencoba bila broker belum hidup
    c.loop_start()
    return c


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    mq = mulai_mqtt() if MQTT_ENABLED else None
    log.info("Model dimuat: %s | MQTT: %s", MODEL_PATH, "aktif" if mq else "mati")
    yield
    if mq:
        mq.loop_stop()
        mq.disconnect()


app = FastAPI(title="ML Prediksi Panen Maggot", lifespan=lifespan)


@app.post("/predict")
def predict(f: Fitur):
    return {"hari_menuju_panen": hitung(f, "http")}


@app.get("/health")
def health():
    return {"status": "ok", "model": os.path.basename(MODEL_PATH), "mqtt": MQTT_ENABLED}
