FROM python:3.11-slim-bookworm

# Install system dependencies for OpenCV and other edge requirements
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files
COPY . .

# Set environment variables for non-buffered stdout (better for docker logs)
ENV PYTHONUNBUFFERED=1

# Run the main manager script
CMD ["python", "main_edge.py"]
