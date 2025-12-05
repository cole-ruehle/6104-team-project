FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

# Render (and most PaaS) inject PORT; default to 8001 for local use
ENV CONFIG=/app/app.yml \
    KMP_DUPLICATE_LIB_OK=TRUE \
    PORT=8001

EXPOSE 8001

CMD ["uvicorn", "txtai.api.application:app", "--host", "0.0.0.0", "--port", "${PORT:-8001}"]
