import base64
import io
import threading

import numpy as np
from PIL import Image

MODEL_NAME = "buffalo_s"
MATCH_SIM_THRESHOLD = 0.45  # cosine similarity >= threshold = match (kalibrasi lapangan)
MATCH_MARGIN = 0.05         # selisih minimum skor terbaik vs runner-up

_MODEL = None
_LOCK = threading.Lock()


class NoFaceError(ValueError):
    pass


def _get_model():
    global _MODEL
    if _MODEL is None:
        with _LOCK:
            if _MODEL is None:
                from insightface.app import FaceAnalysis
                app = FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
                app.prepare(ctx_id=-1, det_size=(640, 640))
                _MODEL = app
    return _MODEL


def embed(photo_b64: str) -> list:
    """Embedding ArcFace 512-d (ternormalisasi). Raise NoFaceError jika jumlah wajah != 1."""
    if "," in photo_b64:
        photo_b64 = photo_b64.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(photo_b64))).convert("RGB")
    arr = np.asarray(img)[:, :, ::-1]  # RGB -> BGR
    faces = _get_model().get(arr)
    if len(faces) == 0:
        raise NoFaceError("no_face_detected")
    if len(faces) > 1:
        raise NoFaceError("multiple_faces")
    v = np.asarray(faces[0].normed_embedding, dtype=np.float32)
    v = v / max(np.linalg.norm(v), 1e-12)
    return [float(x) for x in v]


def cos_sim(a, b) -> float:
    return float(np.asarray(a, dtype=np.float32) @ np.asarray(b, dtype=np.float32))
