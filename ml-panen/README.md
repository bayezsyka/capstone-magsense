# ML Prediksi Panen Maggot (Raspberry Pi 5)

Layanan FastAPI yang memuat `harvest.json` (XGBoost) dan mengembalikan `hari_menuju_panen`.

## Pasang
1. Salin `harvest.json` dari Colab ke folder `model/`.
2. Salin folder ini ke Pi: `scp -r ml-panen <user>@<ip-pi>:~/`
3. Di Pi (Raspberry Pi OS 64-bit), kalau Docker belum ada:
   `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER` lalu login ulang.
4. `cd ml-panen && docker compose up -d --build`

## Tes
```
curl -s localhost:8000/health
curl -s -X POST localhost:8000/predict -H "Content-Type: application/json" -d '{
  "suhu_udara_c": 29.5, "kelembapan_udara_pct": 70, "kelembapan_media_adc": 2100,
  "jumlah_baby_larva": 12, "jumlah_adult_larva": 8, "jumlah_prepupa": 2, "jumlah_pupa": 0}'
```
Dokumentasi interaktif: `http://localhost:8000/docs`

## Dari Express
```js
const r = await fetch("http://localhost:8000/predict", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify(fitur),            // 7 kunci seperti contoh di atas
});
const { hari_menuju_panen } = await r.json();
```
Input di luar rentang / NaN / kunci hilang -> HTTP 422 (tidak ada prediksi sembarangan).
Rentang validasi ada di kelas `Fitur` di `main.py`; sesuaikan dengan data aslimu.

## MQTT (opsional)
Di `docker-compose.yml` set `MQTT_ENABLED: "true"` dan sesuaikan `MQTT_TOPIC_IN` / `MQTT_TOPIC_OUT`.
Payload masuk: JSON berisi 7 fitur (kunci tambahan diabaikan). Hasil dipublikasikan (retained) ke topik keluar
sebagai `{"hari_menuju_panen": 7.3, "waktu": "..."}`.

## Operasional
- Ganti model: timpa `model/harvest.json`, lalu `docker compose restart ml`.
- Log: `docker compose logs -f ml`
- Riwayat input + prediksi: `data/prediksi.db` (tabel `prediksi`; kolom `hari_menuju_panen_aktual`
  bisa kamu isi saat panen sebenarnya diketahui, untuk retraining).
- Kunci versi XGBoost di `requirements.txt` agar sama dengan versi di Colab.
