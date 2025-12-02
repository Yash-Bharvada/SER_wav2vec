# SER_wav2vec

Speech Emotion Recognition using Wav2Vec2 with a FastAPI backend and a Next.js web UI.

## Overview
- Backend: FastAPI service that loads a fine‑tuned Wav2Vec2 model and exposes `POST /predict` to classify emotions from audio.
- Frontend: Next.js app that lets you record or upload audio and visualizes detected emotions.

## Project Structure
- `ser_backend/` FastAPI server and model assets.
- `ser_web/` Next.js application (App Router, TypeScript, Tailwind).
- `.gitattributes` Git text normalization settings.

## Prerequisites
- Python 3.11
- Node.js 18+
- FFmpeg installed and available on PATH

## Backend Setup (local)
1. `cd ser_backend`
2. Create and activate a virtual environment.
   - PowerShell: `python -m venv .venv; .\.venv\Scripts\Activate.ps1`
3. `pip install -r requirements.txt`
4. Ensure FFmpeg is installed.
5. Set the model directory and run the server.
   - PowerShell: `$env:MODEL_DIR = "$PWD\best_model"; uvicorn server:app --host 0.0.0.0 --port 8000`

Environment variables supported by the backend:
- `MODEL_DIR` path to the directory containing `config.json`, `model.safetensors`, and `preprocessor_config.json`.
- `FFMPEG_BIN` override ffmpeg binary name/path.
- `CORS_ORIGINS` comma‑separated allowed origins.

## Backend with Docker
1. `docker build -t ser-backend ./ser_backend`
2. `docker run -p 8000:8000 -e MODEL_DIR=/app/best_model ser-backend`

## Frontend Setup
1. `cd ser_web`
2. `npm install`
3. Create `.env.local` with:
   - `BACKEND_URL=http://127.0.0.1:8000`
4. `npm run dev`
5. Open `http://localhost:3000`

## API
- `POST /predict` form‑data: `file` (audio)
- Response: `{ results: [{ label, score }...], dominant: { label, score } }`

## Model Details
- Architecture: `Wav2Vec2ForSequenceClassification` fine‑tuned for emotion classification.
- Labels: `angry`, `calm`, `disgust`, `fear`, `happy`, `neutral`, `sad`, `surprise`.
- Sampling rate: `16000 Hz` mono (inputs are resampled and converted to mono).
- Files: `ser_backend/best_model/` contains `config.json`, `model.safetensors`, `preprocessor_config.json`, `training_args.bin`.
- Inference:
  - The backend converts uploaded audio to 16 kHz mono using FFmpeg when possible, otherwise via `soundfile`/`librosa`.
  - Very short inputs (< ~0.1s) are padded to ~1s to stabilize predictions.
  - Probabilities are computed via softmax over logits and returned with labels in descending order.

## Notes
- When running locally, keep the backend on port `8000` and point the web app to it via `ser_web/.env.local`.
- If the model directory is not found, set `MODEL_DIR` explicitly as shown above.
