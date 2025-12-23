FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create cache directory for HuggingFace
RUN mkdir -p /hf_cache && chmod 777 /hf_cache

# Environment
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/hf_cache
ENV HF_MODEL_NAME=ai4bharat/IndicBERTv2-MLM-Back-TLM

EXPOSE 7010

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7010"]
