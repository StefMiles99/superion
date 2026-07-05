# SUPERION backend — Cloud Run / producción
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
        fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/README.md ./
COPY backend/src ./src
COPY backend/supabase ./supabase
COPY elevenlabs ./elevenlabs

RUN pip install --no-cache-dir ".[prod]"

EXPOSE 8080

CMD ["sh", "-c", "uvicorn interface.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
