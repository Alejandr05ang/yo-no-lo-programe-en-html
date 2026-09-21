# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy project definition
COPY pyproject.toml uv.lock ./

# Install dependencies (system-wide for slim image, no dev dependencies)
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy application source
COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY certs/ ./certs/

# Create a non-root user and switch to it
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Start FastAPI server on port supplied by Cloud Run ($PORT)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
