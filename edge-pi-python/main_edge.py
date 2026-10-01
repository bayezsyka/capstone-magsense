import subprocess
import time
import sys
import threading
import logging
from local_db import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [EDGE SUPERVISOR] - %(message)s")

WORKERS = [
    "mqtt_worker.py",
    "cv_worker.py",
    "ml_worker.py",
    "local_api.py",
    "cloud_sync.py"
]

processes = {}

def stream_logs(pipe, name, is_err=False):
    try:
        for line in iter(pipe.readline, b""):
            if line:
                decoded = line.decode("utf-8", errors="replace").strip()
                prefix = f"[{name} ERR]" if is_err else f"[{name}]"
                print(f"{prefix} {decoded}", flush=True)
    except Exception as e:
        logging.error(f"Log streaming error for {name}: {e}")

def start_worker(worker_name):
    logging.info(f"Starting worker: {worker_name}")
    proc = subprocess.Popen(
        [sys.executable, worker_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=1
    )
    threading.Thread(target=stream_logs, args=(proc.stdout, worker_name, False), daemon=True).start()
    threading.Thread(target=stream_logs, args=(proc.stderr, worker_name, True), daemon=True).start()
    return proc

def run_supervisor():
    init_db()
    for w in WORKERS:
        processes[w] = start_worker(w)

    while True:
        time.sleep(5)
        for w, proc in list(processes.items()):
            if proc.poll() is not None:
                logging.warning(f"Worker {w} stopped (code: {proc.returncode}). Restarting in 3s...")
                time.sleep(3)
                processes[w] = start_worker(w)

if __name__ == "__main__":
    run_supervisor()
