import base64
import io
from PIL import Image


def _load(photo_b64: str) -> Image.Image:
    if "," in photo_b64:
        photo_b64 = photo_b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(photo_b64))).convert("L")


def ahash(photo_b64: str, size: int = 16) -> str:
    img = _load(photo_b64).resize((size, size))
    px = list(img.getdata())
    avg = sum(px) / len(px)
    return "".join("1" if p > avg else "0" for p in px)


def hamming(a: str, b: str) -> int:
    return sum(c1 != c2 for c1, c2 in zip(a, b))


MATCH_THRESHOLD = 150  # of 256 bits; matcher simulasi pilot sangat longgar, ganti ArcFace utk produksi
