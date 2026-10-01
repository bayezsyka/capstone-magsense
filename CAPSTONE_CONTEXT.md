# Capstone Project Context

## Project
Sistem otomasi mikroklimat dan monitoring pertumbuhan Black Soldier Fly (BSF) / maggot.

Project ini memiliki beberapa subsistem:
1. ESP32 sebagai local controller.
2. Raspberry Pi sebagai edge computing device.
3. Computer Vision menggunakan YOLOv8.
4. Prediksi panen menggunakan XGBoost.
5. Backend, database, dan website monitoring.

## Current Development Condition

Hardware PCB sedang difabrikasi.

Untuk development sekarang:
- Raspberry Pi belum digunakan secara terus-menerus.
- Development edge dilakukan di Mac menggunakan Docker.
- Target akhirnya stack Docker yang sama dapat dijalankan di Raspberry Pi.
- Raspberry Pi nantinya digunakan saat testing akhir dan expo.
- Laptop dapat digunakan sebagai fallback development/testing environment.

Physical prototype expo saat ini difokuskan pada 1 chamber larva/maggot.

PCB tetap menyediakan dukungan 2 zone:
- Larva
- Lalat

Tetapi implementasi fisik utama saat ini adalah chamber larva.

## System Architecture

### ESP32

ESP32 bertanggung jawab untuk fungsi real-time/local:

- membaca DHT22,
- membaca capacitive soil moisture,
- menjalankan logika kontrol mikroklimat,
- menghasilkan PWM untuk fan,
- mengendalikan heater melalui relay,
- mengendalikan solenoid valve,
- mengirim data sensor dan actuator state ke edge device.

Kontrol mikroklimat harus tetap berjalan di ESP32.

Jangan memindahkan fuzzy control / PWM control utama ke Raspberry Pi atau backend.

ESP32 harus tetap dapat menjalankan kontrol walaupun Raspberry Pi, Docker, backend, atau internet sedang tidak tersedia.

### Edge / Raspberry Pi

Raspberry Pi berfungsi sebagai pusat operasi lokal / edge computing.

Fungsi yang direncanakan:

- MQTT broker,
- menerima telemetry ESP32,
- local backend/service,
- local SQLite storage,
- menerima input kamera,
- YOLOv8 inference,
- XGBoost harvest prediction,
- local API,
- pengiriman/sinkronisasi data ke backend pusat,
- mendukung monitoring lokal ketika internet tidak tersedia.

Dalam C300, Raspberry Pi memang ditempatkan sebagai pusat operasi lokal yang menjalankan backend lokal, MQTT broker, local streaming, YOLOv8, XGBoost, dan SQLite.

### Camera

Camera terhubung ke Raspberry Pi / edge device.

Camera tidak terhubung ke ESP32.

Camera digunakan sebagai input Computer Vision YOLOv8 untuk monitoring fase pertumbuhan BSF.

### YOLOv8

YOLOv8 dijalankan pada edge device.

Output YOLO digunakan sebagai informasi fase pertumbuhan yang kemudian dapat digunakan oleh sistem monitoring dan pipeline prediksi.

### XGBoost

XGBoost digunakan untuk prediksi panen.

Input berasal dari data yang relevan dari:
- microclimate,
- historical data,
- hasil analitik / growth phase sesuai pipeline project.

### Backend / Website

Sistem memiliki konsep:

Edge/local:
- local backend
- MQTT
- SQLite

Central:
- backend pusat
- PostgreSQL
- realtime communication / WebSocket
- website monitoring

Website harus dapat menampilkan informasi seperti:
- kondisi mikroklimat,
- actuator status,
- hasil computer vision,
- harvest prediction.

## Docker Development Goal

Docker bukan pengganti ESP32.

Docker digunakan untuk membuat software environment edge yang portable:

Mac development
→ Docker containers
→ test
→ Raspberry Pi deployment

Prioritas saat ini adalah memastikan software stack dapat berjalan secara konsisten pada:
- Mac Apple Silicon arm64
- Raspberry Pi arm64

Jangan membuat dependency yang hanya mendukung amd64 jika bisa dihindari.

Hardware-specific integration seperti camera device dan accelerator harus dipisahkan dari core application sehingga project tetap bisa dikembangkan dengan mock input di Mac.

## Development Strategy

Selama ESP32/PCB/Raspberry Pi belum tersedia penuh:

- ESP32 telemetry dapat menggunakan mock publisher.
- Camera dapat menggunakan image/video test input.
- YOLO dapat diuji dari file.
- XGBoost dapat diuji dengan sample/mock feature input.
- MQTT, backend, database, API, dan frontend dapat dikembangkan penuh di Docker.

Setelah hardware tersedia:

mock ESP32
→ real ESP32

test images/video
→ real camera

Mac Docker
→ Raspberry Pi Docker

## Current Repository

Repository:
smart-farming-platform

Existing folders detected:
- backend-express
- frontend-react
- edge-pi-python
- database
- iot-esp32
- docker-compose.yml
- sqlmaggot.sql

Existing implementation may be old, incomplete, or inconsistent with the current architecture.

DO NOT assume the current repository structure is correct.

Audit it against this document first.

## Current Priority

Current priority:

1. Audit existing repository.
2. Determine what can still be reused.
3. Define final Docker architecture.
4. Get MQTT + edge data pipeline running.
5. Create mock ESP32 telemetry.
6. Integrate local storage.
7. Integrate backend/frontend.
8. Integrate YOLO.
9. Integrate XGBoost.
10. Test on Raspberry Pi.

Avoid unnecessary rewrites if existing code can be reused safely.