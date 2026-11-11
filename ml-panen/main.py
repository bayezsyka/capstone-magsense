import json
import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Optional

import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ml-panen")

FITUR = [
    "suhu_udara_c",
    "kelembapan_udara_pct",
    "kelembapan_media_adc",
    "jumlah_baby_larva",
    "jumlah_adult_larva",
    "jumlah_prepupa",
    "jumlah_pupa",
]

class Fitur(BaseModel):
    suhu_udara_c: float = Field(ge=0, le=60, allow_inf_nan=False)
    kelembapan_udara_pct: float = Field(ge=0, le=100, allow_inf_nan=False)
    kelembapan_media_adc: float = Field(ge=0, le=4095, allow_inf_nan=False)
    jumlah_baby_larva: float = Field(ge=0, allow_inf_nan=False)
    jumlah_adult_larva: float = Field(ge=0, allow_inf_nan=False)
    jumlah_prepupa: float = Field(ge=0, allow_inf_nan=False)
    jumlah_pupa: float = Field(ge=0, allow_inf_nan=False)

class PrediksiOut(BaseModel):
    hari_menuju_panen: float

class HealthOut(BaseModel):
    status: str
    model: str
    mqtt: bool

MODEL_PATH = os.getenv("MODEL_PATH", "/app/model/harvest.json")
DB_PATH = os.getenv("DB_PATH", "/data/prediksi.db")
MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() in ("1", "true", "yes")

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"File model tidak ditemukan: {MODEL_PATH}. Taruh harvest.json di folder model/.")

model = xgb.Booster()
model.load_model(MODEL_PATH)
_nama = model.feature_names
if _nama is not None and list(_nama) != FITUR:
    logger.warning(f"Nama fitur model {_nama} berbeda dengan FITUR {FITUR}, akan disesuaikan")

logger.info(f"Model XGBoost berhasil dimuat dari {MODEL_PATH}")

def simpan_riwayat(fitur: dict, hari: float):
    if not DB_PATH:
        return
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS riwayat (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    suhu REAL, rh_udara REAL, rh_media_adc REAL,
                    baby REAL, adult REAL, prepupa REAL, pupa REAL,
                    hari_menuju_panen REAL
                )
            """)
            conn.execute("""
                INSERT INTO riwayat (suhu, rh_udara, rh_media_adc, baby, adult, prepupa, pupa, hari_menuju_panen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fitur["suhu_udara_c"], fitur["kelembapan_udara_pct"], fitur["kelembapan_media_adc"],
                fitur["jumlah_baby_larva"], fitur["jumlah_adult_larva"], fitur["jumlah_prepupa"],
                fitur["jumlah_pupa"], hari
            ))
    except Exception as e:
        logger.error(f"Gagal simpan riwayat DB: {e}")

def hitung_prediksi(data: Fitur) -> float:
    row = data.model_dump()
    df = pd.DataFrame([row])[FITUR]
    dm = xgb.DMatrix(df, feature_names=FITUR)
    nilai = float(model.predict(dm)[0])
    return max(0.0, round(nilai, 2))

mqtt_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mqtt_client
    if MQTT_ENABLED:
        try:
            import paho.mqtt.client as mqtt_mod
            host = os.getenv("MQTT_HOST", "host.docker.internal")
            port = int(os.getenv("MQTT_PORT", "1883"))
            topic_in = os.getenv("MQTT_TOPIC_IN", "maggot/fitur")
            topic_out = os.getenv("MQTT_TOPIC_OUT", "maggot/prediksi")

            client = mqtt_mod.Client(mqtt_mod.CallbackAPIVersion.VERSION2, client_id="ml-panen-sub")

            def on_connect(c, userdata, flags, reason_code, properties):
                logger.info(f"MQTT terhubung ({reason_code}), subscribe: {topic_in}")
                c.subscribe(topic_in)

            def on_message(c, userdata, msg):
                try:
                    payload = json.loads(msg.payload.decode())
                    fitur = Fitur(**payload)
                    hari = hitung_prediksi(fitur)
                    simpan_riwayat(fitur.model_dump(), hari)
                    out = json.dumps({"hari_menuju_panen": hari})
                    c.publish(topic_out, out)
                    logger.info(f"MQTT Prediksi: {hari} hari -> {topic_out}")
                except Exception as e:
                    logger.error(f"MQTT gagal proses: {e}")

            client.on_connect = on_connect
            client.on_message = on_message
            client.connect(host, port, keepalive=60)
            client.loop_start()
            mqtt_client = client
        except Exception as e:
            logger.error(f"Gagal inisialisasi MQTT: {e}")

    yield

    if mqtt_client is not None:
        try:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        except Exception:
            pass

app = FastAPI(title="ML Prediksi Panen Maggot", version="1.0.0", lifespan=lifespan)

@app.get("/health", response_model=HealthOut)
def health():
    return HealthOut(
        status="ok",
        model=os.path.basename(MODEL_PATH),
        mqtt=MQTT_ENABLED and mqtt_client is not None
    )

@app.post("/predict", response_model=PrediksiOut)
def predict(fitur: Fitur):
    try:
        hari = hitung_prediksi(fitur)
        simpan_riwayat(fitur.model_dump(), hari)
        return PrediksiOut(hari_menuju_panen=hari)
    except Exception as e:
        logger.exception("Gagal menghitung prediksi")
        raise HTTPException(status_code=500, detail=str(e))
