import os
import time
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
KEY = os.environ["EMERGENT_LLM_KEY"]
# Fal Universal Key: queue inference via Emergent proxy saja (bukan Fal Platform APIs).
BASE = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com").rstrip("/") + "/api/v1/fal"
EP = "fal-ai/stable-audio"
OUT = "/tmp/radiusgate-bgm.mp3"

payload = {
    "prompt": "uplifting corporate ambient instrumental, soft piano and warm pads, gentle steady rhythm, optimistic professional technology mood, no vocals, seamless loop feel",
    "seconds_total": 47,
}

r = requests.post(f"{BASE}/proxy", headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
                                            "X-Fal-Target-Url": f"https://queue.fal.run/{EP}"},
                  json=payload, timeout=60)
if r.status_code == 402:
    print("GAGAL: kredit Universal Key tidak cukup")
    raise SystemExit(1)
r.raise_for_status()
sub = r.json()
status_url, response_url = sub["status_url"], sub["response_url"]
H = {"Authorization": f"Bearer {KEY}"}
deadline = time.monotonic() + 900
while time.monotonic() < deadline:
    s = requests.get(status_url, headers=H, timeout=30).json()
    st = (s.get("status") or "").upper()
    if st in ("COMPLETED", "OK"):
        res = requests.get(response_url, headers=H, timeout=60).json()
        url = None
        for key in ("audio", "audio_file", "output"):
            v = res.get(key)
            if isinstance(v, dict) and v.get("url"):
                url = v["url"]
                break
        if not url:
            print("GAGAL: tidak ada url audio:", res)
            raise SystemExit(1)
        dl = requests.get(url, timeout=300)
        open(OUT, "wb").write(dl.content)
        print("MUSIK OK ->", OUT, len(dl.content) // 1024, "KB")
        raise SystemExit(0)
    if st in ("FAILED", "CANCELLED", "CANCELED", "ERROR"):
        print("GAGAL status:", st, s)
        raise SystemExit(1)
    time.sleep(4)
print("GAGAL: timeout")
raise SystemExit(1)
