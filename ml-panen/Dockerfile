FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

# libgomp1 wajib untuk XGBoost; user uid 1000 = user default Raspberry Pi OS
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -u 1000 -m app && mkdir -p /app/model /data && chown app /data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
