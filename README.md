**Setup Capstone Magsense — Docker Desktop**

Buat yang baru clone repo dan mau langsung jalanin project di Windows, macOS, atau Linux:

1. **Masuk ke folder project dan buat `.env`**

```bash
cd capstone-magsense
cp .env.example .env
```

File `.env` default sudah disiapkan supaya bisa langsung dipakai di Docker.

2. **Jalankan semua service**

```bash
docker compose up --build -d
```

Docker akan otomatis menjalankan:

- PostgreSQL
- Mosquitto MQTT
- Backend Express API + WebSocket
- Frontend React
- Mock IoT Publisher
- Edge Python Service
- XGBoost Worker
- SQLite Edge
- Cloud Sync Worker

3. **Buka website**

```text
http://localhost:3000
```

Akun login default:

```text
Admin
admin@capstone.com / password
atau
admin@maggott.com / admin123

Operator
operator@capstone.com / password
atau
operator@maggott.com / operator123
```

Kalau cuma mau fokus ke bagian tertentu:

**Central Stack — Frontend + Backend**

```bash
docker compose -f docker-compose.central.yml up --build -d
```

Menjalankan PostgreSQL, Backend API, dan Frontend.

**Edge Stack — IoT + AI**

```bash
docker compose -f docker-compose.edge.yml up --build -d
```

Menjalankan MQTT Broker, Mock IoT, dan Edge Python Worker.

Perintah yang sering dipakai:

```bash
# Lihat log
docker compose logs -f

# Stop semua container
docker compose down

# Reset total termasuk database/volume lokal
docker compose down -v
```

**Catatan:** pastikan Docker Desktop sudah aktif sebelum menjalankan command di atas.
