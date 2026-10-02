import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class SPARequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Resolve target path in dist
        req_path = self.path.split("?")[0].split("#")[0]
        full_path = os.path.join(DIRECTORY, req_path.lstrip("/"))

        # If file does not exist and request is not for a static asset with extension, serve index.html
        if not os.path.exists(full_path) and not os.path.splitext(req_path)[1]:
            self.path = "/index.html"
        elif not os.path.exists(full_path) and req_path == "/favicon.ico":
            # Fallback to manifest icon or 204 if missing
            self.send_response(204)
            self.end_headers()
            return

        return super().do_GET()

def run(port=3000):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, SPARequestHandler)
    print(f"SPA Server running on http://localhost:{port} (serving {DIRECTORY})")
    httpd.serve_forever()

if __name__ == "__main__":
    run(3000)
