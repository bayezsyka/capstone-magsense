import subprocess
import time
import sys
import threading
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [MAIN EDGE] - %(message)s')

# Daftar worker yang akan dijalankan
WORKERS = [
    "mqtt_worker.py",
    "cv_worker.py",
    "ml_worker.py",
    "cloud_sync.py",
    "webrtc_server.py"
]

# Dictionary untuk menyimpan reference ke object subprocess
processes = {}

def stream_output(process, name):
    """
    Fungsi untuk membaca output dari subprocess secara non-blocking
    dan mencetaknya ke terminal utama dengan prefix nama worker.
    """
    try:
        for line in iter(process.stdout.readline, b''):
            if line:
                decoded_line = line.decode('utf-8', errors='replace').strip()
                print(f"[{name}] {decoded_line}")
    except Exception as e:
        logging.error(f"Error reading stdout for {name}: {e}")

def stream_error(process, name):
    """
    Fungsi untuk membaca error (stderr) dari subprocess
    dan mencetaknya ke terminal utama.
    """
    try:
        for line in iter(process.stderr.readline, b''):
            if line:
                decoded_line = line.decode('utf-8', errors='replace').strip()
                print(f"[{name} ERROR] {decoded_line}", file=sys.stderr)
    except Exception as e:
        logging.error(f"Error reading stderr for {name}: {e}")

def start_worker(worker_name):
    """
    Menjalankan script Python sebagai subprocess.
    """
    logging.info(f"Memulai worker: {worker_name}")
    # Gunakan sys.executable untuk memastikan kita memakai Python interpreter yang sama
    process = subprocess.Popen(
        [sys.executable, worker_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=1
    )
    
    # Buat thread terpisah untuk membaca output agar tidak memblokir main thread
    threading.Thread(target=stream_output, args=(process, worker_name), daemon=True).start()
    threading.Thread(target=stream_error, args=(process, worker_name), daemon=True).start()
    
    return process

def monitor_workers():
    """
    Memantau seluruh worker. Jika ada yang mati, hidupkan kembali (auto-restart).
    """
    # Inisialisasi awal
    for worker in WORKERS:
        processes[worker] = start_worker(worker)
        
    try:
        while True:
            for worker, process in processes.items():
                # poll() mengembalikan None jika proses masih berjalan
                # mengembalikan return code jika proses sudah selesai/mati
                if process.poll() is not None:
                    logging.warning(f"Worker {worker} berhenti tak terduga (Return code: {process.returncode}). Mencoba restart dalam 5 detik...")
                    time.sleep(5)
                    processes[worker] = start_worker(worker)
                    
            time.sleep(2) # Cek status setiap 2 detik
            
    except KeyboardInterrupt:
        logging.info("Menerima perintah penghentian (Ctrl+C). Mematikan semua worker...")
        for worker, process in processes.items():
            if process.poll() is None:
                logging.info(f"Menghentikan {worker}...")
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
        logging.info("Semua worker telah dihentikan dengan aman.")
        sys.exit(0)

if __name__ == "__main__":
    logging.info("=============================================")
    logging.info("      SMART FARMING EDGE MANAGER DIMULAI     ")
    logging.info("=============================================")
    monitor_workers()
