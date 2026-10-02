FROM python:3.12-slim

WORKDIR /app

# システム依存パッケージ（OR-Tools に必要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run は PORT 環境変数を注入する
ENV PORT=8080
EXPOSE 8080

CMD exec gunicorn main:app \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --threads 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120
