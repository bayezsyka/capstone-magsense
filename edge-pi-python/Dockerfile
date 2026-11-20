FROM python:3.11-slim-bookworm AS iot

WORKDIR /app
RUN pip install --no-cache-dir "paho-mqtt>=1.6.1,<3" "requests>=2.31.0,<3"
COPY main_edge.py mqtt_worker.py cloud_sync.py local_api.py local_db.py ./
ENV PYTHONUNBUFFERED=1
ENV EDGE_WORKERS=mqtt_worker.py,cloud_sync.py,local_api.py
CMD ["python", "main_edge.py"]

FROM python:3.11-slim-bookworm AS ai

RUN apt-get update && apt-get install -y \
    libgl1 \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["python", "main_edge.py"]
