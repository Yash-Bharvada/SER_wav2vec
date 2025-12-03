---
license: mit
datasets:
  - confit/cremad-parquet
language:
  - en
metrics:
  - accuracy
  - f1
base_model:
  - facebook/wav2vec2-base-960h
library_name: transformers
tags:
  - speech
  - speech-emotion-recognition
  - ser
  - wav2vec2
---

# SER Wav2Vec2 — Speech Emotion Recognition

## Model Summary
- Architecture: Wav2Vec2 encoder with a sequence classification head (`Wav2Vec2ForSequenceClassification`).
- Sampling rate: 16 kHz mono inputs.
- Label set: `angry`, `calm`, `disgust`, `fear`, `happy`, `neutral`, `sad`, `surprise`.
- Base: `facebook/wav2vec2-base-960h` fine‑tuned for emotion classification.

## Intended Use
- Input: short audio clips of speech.
- Output: per‑class probabilities for the above emotions and a dominant label.
- Use cases: UX feedback, call‑center analytics, demo apps, research prototypes.

## Out‑of‑Scope
- Clinical or safety‑critical decisions.
- Non‑speech audio (music, noise) or multilingual speech without adaptation.

## Data and Training
- Dataset: CREMA‑D (via `confit/cremad-parquet`).
- Preprocessing: resample to 16 kHz, convert to mono, optional padding for very short clips.
- Fine‑tuning objective: cross‑entropy classification.

## Configuration Snapshot
- Hidden size: 768
- Attention heads: 12
- Hidden layers: 12
- Classifier projection: 256
- Final dropout: 0.0
- Feature extractor norm: group

## Metrics
- Reported metrics: accuracy, F1‑score.
- Benchmark numbers depend on split and preprocessing; fill in with your evaluation results.

## Usage

### Python (Transformers)
```python
import torch, numpy as np, soundfile as sf, librosa
from transformers import Wav2Vec2ForSequenceClassification, AutoFeatureExtractor

model_dir = "path/to/best_model"  # local directory or Hub repo id
model = Wav2Vec2ForSequenceClassification.from_pretrained(model_dir)
fe = AutoFeatureExtractor.from_pretrained(model_dir)
model.eval()

def load_audio(path, sr=fe.sampling_rate):
    y, s = sf.read(path, always_2d=False)
    if isinstance(y, np.ndarray):
        if y.ndim > 1:
            y = np.mean(y, axis=1)
        if s != sr:
            y = librosa.resample(y.astype(np.float32), orig_sr=s, target_sr=sr)
        y = y.astype(np.float32)
    else:
        y = np.array(y, dtype=np.float32)
    if y.size < sr // 10:
        y = np.pad(y, (0, max(0, sr - y.size)))
    return y

audio = load_audio("sample.wav")
inputs = fe(audio, sampling_rate=fe.sampling_rate, return_tensors="pt")
with torch.no_grad():
    logits = model(**inputs).logits
probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
labels = [model.config.id2label[str(i)] if isinstance(list(model.config.id2label.keys())[0], str) else model.config.id2label[i] for i in range(len(probs))]
pairs = sorted(zip(labels, probs), key=lambda x: x[1], reverse=True)
print(pairs[:3])
```

### FastAPI Integration
This repository includes a FastAPI server that exposes `POST /predict` and returns sorted label probabilities and the dominant emotion.

## Input and Output Schema
- Input: audio file (`wav`, `mp3`, `m4a`, etc.). Internally converted to 16 kHz mono.
- Output JSON:
```json
{
  "results": [{ "label": "happy", "score": 0.81 }, ...],
  "dominant": { "label": "happy", "score": 0.81 }
}
```

## Limitations and Bias
- Emotion labels are subjective; datasets may reflect staged emotions.
- Performance can degrade with strong noise, reverberation, or accents not present in training.
- Not suitable for sensitive decision‑making without rigorous validation.

## Ethical Considerations
- Obtain consent where required.
- Be transparent about the model’s limitations and intended use.
- Avoid deployment in contexts where misclassification can cause harm.

## Citation
If you use this model, please cite:
- Baevski et al., "wav2vec 2.0: A Framework for Self‑Supervised Learning of Speech Representations", NeurIPS 2020.
- CREMA‑D: Cao et al., "CREMA-D: Crowd-sourced Emotional Multimodal Actors Dataset", IEEE Transactions on Affective Computing.

## License
MIT

