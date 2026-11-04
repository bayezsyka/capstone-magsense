# Capstone Magsense

[![CI/CD Central Deploy (CT 801)](https://github.com/bayezsyka/capstone-magsense/actions/workflows/deploy.yml/badge.svg)](https://github.com/bayezsyka/capstone-magsense/actions/workflows/deploy.yml)

**Setup Capstone Magsense — Docker Desktop**

Buat yang baru clone repo dan mau langsung jalanin project di Windows, macOS, atau Linux:

1. **Masuk ke folder project dan buat `.env`**

```bash
cd capstone-magsense
cp .env.example .env
```

Isi `.env` dengan password database dan `JWT_SECRET` yang kuat. File `.env` tidak boleh di-commit.

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

Akun tidak lagi di-seed dengan password default. Buat admin pertama dan simpan password yang ditampilkan sekali oleh script:

```bash
docker compose exec backend node scripts/seed-admin.js admin@example.com
```

Untuk merotasi password akun yang sudah ada:

```bash
docker compose exec backend node scripts/reset-password.js admin@example.com
```

Jangan gunakan kredensial demo di production. Setelah merotasi password, rotasi juga `JWT_SECRET` agar semua sesi lama tidak valid.

Untuk test API, gunakan database dan akun test terpisah:

```bash
cd backend-express
cp ../.env.test.example .env.test
npm run test:api
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
