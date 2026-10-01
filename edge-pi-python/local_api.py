import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from local_db import init_db, get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [LOCAL API] - %(message)s")
PORT = int(os.environ.get("LOCAL_API_PORT", 8080))

class EdgeLocalAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            if path == "/" or path == "/api/status":
                self._send_json(200, {
                    "node": "RaspberryPi_Edge_Local",
                    "status": "online",
                    "storage": "sqlite",
                    "message": "Edge local API active for offline/online operation"
                })
            elif path == "/api/sensor/latest":
                cursor.execute("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1")
                row = cursor.fetchone()
                self._send_json(200, dict(row) if row else {})
            elif path == "/api/cv/latest":
                cursor.execute("SELECT * FROM cv_results ORDER BY timestamp DESC LIMIT 1")
                row = cursor.fetchone()
                self._send_json(200, dict(row) if row else {})
            elif path == "/api/prediction/latest":
                cursor.execute("SELECT * FROM harvest_predictions ORDER BY timestamp DESC LIMIT 1")
                row = cursor.fetchone()
                self._send_json(200, dict(row) if row else {})
            elif path == "/api/actuators/latest":
                cursor.execute("SELECT * FROM actuator_logs ORDER BY timestamp DESC LIMIT 10")
                rows = [dict(r) for r in cursor.fetchall()]
                self._send_json(200, rows)
            else:
                self._send_json(404, {"error": "Endpoint not found on local edge"})
        except Exception as e:
            logging.error(f"Error serving request: {e}")
            self._send_json(500, {"error": str(e)})
        finally:
            conn.close()

def run_local_api():
    init_db()
    server = HTTPServer(("0.0.0.0", PORT), EdgeLocalAPIHandler)
    logging.info(f"Local Edge API listening on http://0.0.0.0:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_local_api()
