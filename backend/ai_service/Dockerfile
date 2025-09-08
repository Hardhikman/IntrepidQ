FROM python:3.11-slim

# Set a working directory
WORKDIR /app

# Install system dependencies for FAISS, Torch, Pillow, etc.
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better layer caching)
COPY requirements.txt .

# Install Python dependencies (CPU-only torch to avoid CUDA bloat)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy application code AFTER installing dependencies
COPY . .

# Expose a default port for local dev (Railway will override this with $PORT)
EXPOSE 8000

# Use shell form so $PORT is expanded at runtime by Railway
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
