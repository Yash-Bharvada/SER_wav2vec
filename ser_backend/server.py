import os, io, subprocess, tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import Wav2Vec2ForSequenceClassification, AutoFeatureExtractor
import librosa
import torch, numpy as np, soundfile as sf

app = FastAPI()

# CORS
origins = os.environ.get('CORS_ORIGINS', '*').split(',') if os.environ.get('CORS_ORIGINS') else ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
FFMPEG_BIN = os.environ.get('FFMPEG_BIN', 'ffmpeg')

# ✔ FIXED MODEL PATH — relative, valid, HuggingFace-safe
MODEL_DIR = os.environ.get('MODEL_DIR', 'best_model')

# ✔ Load local model only
model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_DIR, local_files_only=True)
fe = AutoFeatureExtractor.from_pretrained(MODEL_DIR, local_files_only=True)

# Device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)
model.eval()

# Audio processing
def to_wav16k_mono(data: bytes) -> np.ndarray:
    try:
        p = subprocess.run(
            [FFMPEG_BIN, '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
             '-ar', str(fe.sampling_rate), '-ac', '1', '-f', 'wav', 'pipe:1'],
            input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
        )
        audio, sr = sf.read(io.BytesIO(p.stdout), dtype='float32', always_2d=False)
        if isinstance(audio, np.ndarray):
            out = audio.astype(np.float32)
            if sr != fe.sampling_rate:
                out = librosa.resample(out, orig_sr=sr, target_sr=fe.sampling_rate)
            if out.size < fe.sampling_rate // 10:
                out = np.pad(out, (0, fe.sampling_rate - out.size), mode='constant')
            return out
        return np.array(audio, dtype=np.float32)
    except Exception:
        try:
            audio, sr = sf.read(io.BytesIO(data), dtype='float32', always_2d=False)
            if isinstance(audio, np.ndarray):
                if audio.ndim > 1:
                    audio = np.mean(audio, axis=1)
                out = audio.astype(np.float32)
                if sr != fe.sampling_rate:
                    out = librosa.resample(out, orig_sr=sr, target_sr=fe.sampling_rate)
                if out.size < fe.sampling_rate // 10:
                    out = np.pad(out, (0, fe.sampling_rate - out.size), mode='constant')
                return out
            arr = np.array(audio, dtype=np.float32)
            if sr and sr != fe.sampling_rate:
                arr = librosa.resample(arr, orig_sr=sr, target_sr=fe.sampling_rate)
            if arr.size < fe.sampling_rate // 10:
                arr = np.pad(arr, (0, fe.sampling_rate - arr.size), mode='constant')
            return arr
        except Exception:
            try:
                with tempfile.NamedTemporaryFile(delete=True, suffix='.audio') as tmp:
                    tmp.write(data)
                    tmp.flush()
                    y, _sr = librosa.load(tmp.name, sr=fe.sampling_rate, mono=True)
                    return y.astype(np.float32)
            except Exception:
                return np.zeros(fe.sampling_rate, dtype=np.float32)

# Predict endpoint
@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    try:
        data = await file.read()
        audio = to_wav16k_mono(data)
        inputs = fe(audio, sampling_rate=fe.sampling_rate, return_tensors='pt')
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = model(**inputs).logits

        probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
        label_map = model.config.id2label
        label_keys = list(label_map.keys())
        use_str = bool(label_keys) and isinstance(label_keys[0], str)

        labels = []
        for i in range(len(probs)):
            if use_str:
                labels.append(label_map.get(str(i), f"class_{i}"))
            else:
                labels.append(label_map.get(i, f"class_{i}"))

        pairs = sorted(
            [(labels[i], float(probs[i])) for i in range(len(probs))],
            key=lambda x: x[1],
            reverse=True
        )
        dominant = {'label': pairs[0][0], 'score': pairs[0][1]} if pairs else {'label': '', 'score': 0.0}

        return {
            'results': [{'label': l, 'score': s} for l, s in pairs],
            'dominant': dominant
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={'error': 'failed to process audio', 'message': f"{e.__class__.__name__}: {e}"}
        )

@app.get('/')
def root():
    return {'status': 'ok'}
