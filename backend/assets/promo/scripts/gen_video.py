import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
KEY = os.environ["EMERGENT_LLM_KEY"]
# Fal Universal Key: queue inference via Emergent proxy saja (bukan Fal Platform APIs).
BASE = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com").rstrip("/") + "/api/v1/fal"
EP = "fal-ai/kling-video/v3/pro/text-to-video"

CLIPS = [
    ("intro-l", "16:9", "Cinematic slow dolly shot through a bright modern Indonesian government office lobby in the morning, a professional woman in batik uniform walks toward a sleek tablet attendance kiosk at the entrance and smiles while checking in, glass doors, clean teal and white interior, natural daylight, photorealistic, smooth camera motion, no text, no watermark"),
    ("outro-l", "16:9", "Cinematic aerial drone shot slowly rising over a modern Indonesian city at golden hour, prominent clean government building with a flag, warm light, smooth upward motion, photorealistic, no text, no watermark"),
    ("intro-v", "9:16", "Cinematic vertical slow dolly shot in a bright modern Indonesian government office lobby, a professional woman in batik uniform smiles while tapping a sleek tablet attendance kiosk, teal and white interior, natural daylight, photorealistic, smooth camera motion, no text, no watermark"),
    ("outro-v", "9:16", "Cinematic vertical drone shot slowly rising over a modern Indonesian city at golden hour, prominent government building with flag, warm light, photorealistic, smooth motion, no text, no watermark"),
]


def headers(extra=None):
    h = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return h


def generate(name, ar, prompt):
    out = f"/tmp/clip-{name}.mp4"
    if os.path.exists(out) and os.path.getsize(out) > 100000:
        print(name, "sudah ada, skip", flush=True)
        return
    payload = {"prompt": prompt, "duration": "5", "aspect_ratio": ar,
               "generate_audio": False, "negative_prompt": "blur, distort, text, watermark, low quality"}
    r = requests.post(f"{BASE}/proxy", headers=headers({"X-Fal-Target-Url": f"https://queue.fal.run/{EP}"}),
                      json=payload, timeout=60)
    if r.status_code == 402:
        print(name, "GAGAL: kredit Universal Key tidak cukup", flush=True)
        return
    r.raise_for_status()
    sub = r.json()
    status_url, response_url = sub["status_url"], sub["response_url"]
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        s = requests.get(status_url, headers=headers(), timeout=30).json()
        st = (s.get("status") or "").upper()
        if st in ("COMPLETED", "OK"):
            res = requests.get(response_url, headers=headers(), timeout=60).json()
            url = (res.get("video") or {}).get("url")
            if not url:
                print(name, "GAGAL: tidak ada url video", res, flush=True)
                return
            dl = requests.get(url, timeout=300)
            open(out, "wb").write(dl.content)
            print(name, "OK ->", out, len(dl.content) // 1024, "KB", flush=True)
            return
        if st in ("FAILED", "CANCELLED", "CANCELED", "ERROR"):
            print(name, "GAGAL status:", st, s, flush=True)
            return
        time.sleep(4)
    print(name, "GAGAL: timeout", flush=True)


for name, ar, prompt in CLIPS:
    try:
        generate(name, ar, prompt)
    except Exception as e:
        print(name, "ERROR:", e, flush=True)
print("SELESAI SEMUA", flush=True)
