"""
Backend tests:
1) PUT /api/admin/settings must be PARTIAL ($set only sent fields, no clobber to defaults).
2) /api/kiosk/attend with UTC 'Z' timestamps that correspond to 00:13/00:31/01:45 WIB
   under settings work_start=01:00, late_tolerance_min=30, early_checkin_min=30, tz=Asia/Jakarta.
Cleans up TEMP teacher and restores expected final DB state.
"""
import os
import sys
import base64
import io
import uuid
import asyncio
from datetime import datetime, timezone

import pytest
pytestmark = pytest.mark.xdist_group(name="demo_school_settings")
import requests
from PIL import Image
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env")
from faceutil import embed  # noqa: E402

BASE = "http://localhost:8001"
KIOSK_TOKEN = "KIOSK-DEMO-1"
ADMIN_EMAIL = "admin@nusantara.sch.id"
ADMIN_PASSWORD = "Admin123!"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

LAT, LNG = -6.398118, 106.758963

EXPECTED_FINAL = {
    "work_start": "01:00",
    "work_end": "00:00",
    "late_tolerance_min": 30,
    "early_checkin_min": 30,
    "timezone": "Asia/Jakarta",
}


def _load_photo(name: str) -> str:
    with open(f"/app/backend/tests/assets/{name}", "rb") as f:
        return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"


PHOTO = _load_photo("face_c.jpg")
EMB = embed(PHOTO)


@pytest.fixture(scope="module")
def mongo():
    return AsyncIOMotorClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def school_id(mongo):
    loop = asyncio.get_event_loop()
    s = loop.run_until_complete(mongo.schools.find_one({"kiosk_token": KIOSK_TOKEN}, {"_id": 0}))
    assert s
    return s["id"]


@pytest.fixture(scope="module")
def temp_teacher(mongo, school_id):
    loop = asyncio.get_event_loop()
    tid = str(uuid.uuid4())
    doc = {
        "id": tid, "school_id": school_id, "user_id": None,
        "name": "TEST_TEMP_REJECTION", "nip": "TEST-REJ", "subject": "Test",
        "embedding": EMB, "photo": PHOTO, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    loop.run_until_complete(mongo.teachers.insert_one(doc))
    yield tid
    loop.run_until_complete(mongo.teachers.delete_one({"id": tid}))
    loop.run_until_complete(mongo.attendance.delete_many({"teacher_id": tid}))


SETTINGS_KEYS = ("work_start", "work_end", "late_tolerance_min", "early_checkin_min", "timezone", "require_checkin")


@pytest.fixture(scope="module", autouse=True)
def settings_guard(admin_token):
    """Snapshot pengaturan asli sekolah demo dan kembalikan persis setelah modul selesai,
    agar tes tidak pernah menimpa konfigurasi nyata admin."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    orig = requests.get(f"{BASE}/api/admin/settings", headers=hdr, timeout=10).json().get("settings") or {}
    yield
    keep = {k: v for k, v in orig.items() if k in SETTINGS_KEYS}
    if keep:
        requests.put(f"{BASE}/api/admin/settings", json=keep, headers=hdr, timeout=10)


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def _get_settings(tok):
    r = requests.get(f"{BASE}/api/admin/settings", headers=_headers(tok), timeout=10)
    assert r.status_code == 200, r.text
    return r.json().get("settings") or {}


def _put_settings(tok, payload):
    return requests.put(f"{BASE}/api/admin/settings", headers=_headers(tok), json=payload, timeout=10)


def _ensure_baseline(tok):
    """Force baseline via full PUT (all fields Optional, so this is legal)."""
    r = _put_settings(tok, EXPECTED_FINAL)
    assert r.status_code == 200, r.text


def _clear_attendance(mongo, tid):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(mongo.attendance.delete_many({"teacher_id": tid}))


def _attend(att_type, ts_device):
    return requests.post(
        f"{BASE}/api/kiosk/attend",
        headers={"X-Kiosk-Token": KIOSK_TOKEN},
        json={"photo": PHOTO, "lat": LAT, "lng": LNG, "type": att_type,
              "ts_device": ts_device, "client_uuid": str(uuid.uuid4())},
        timeout=15,
    )


# ---------- BACKEND 1: partial PUT ----------

def test_partial_put_only_updates_sent_fields(admin_token):
    _ensure_baseline(admin_token)
    before = _get_settings(admin_token)
    assert before["work_start"] == "01:00"
    assert before["late_tolerance_min"] == 30
    assert before["early_checkin_min"] == 30
    assert before["timezone"] == "Asia/Jakarta"

    # PARTIAL update: only late_tolerance_min
    r = _put_settings(admin_token, {"late_tolerance_min": 25})
    assert r.status_code == 200, r.text

    after = _get_settings(admin_token)
    assert after["late_tolerance_min"] == 25, after
    # Other fields must be intact (no clobber back to defaults)
    assert after["work_start"] == "01:00", after
    assert after["work_end"] == "00:00", after
    assert after["early_checkin_min"] == 30, after
    assert after["timezone"] == "Asia/Jakarta", after

    # revert via partial PUT
    r = _put_settings(admin_token, {"late_tolerance_min": 30})
    assert r.status_code == 200, r.text
    reverted = _get_settings(admin_token)
    assert reverted["late_tolerance_min"] == 30
    assert reverted["work_start"] == "01:00"
    assert reverted["early_checkin_min"] == 30
    assert reverted["timezone"] == "Asia/Jakarta"
    assert reverted["work_end"] == "00:00"


def test_partial_put_empty_body_rejected(admin_token):
    r = _put_settings(admin_token, {})
    assert r.status_code == 400, r.text


# ---------- BACKEND 2: rejection @ 00:13 WIB, ok @ 00:31, late @ 01:45 ----------

def test_too_early_00_13_wib(admin_token, temp_teacher, mongo):
    _ensure_baseline(admin_token)
    _clear_attendance(mongo, temp_teacher)
    # UTC 2026-09-19T17:13:00Z == 2026-09-20 00:13 WIB
    r = _attend("in", "2026-09-19T17:13:00Z")
    assert r.status_code == 422, f"{r.status_code} {r.text}"
    detail = r.json().get("detail", "")
    assert detail.startswith("too_early:00:30:"), detail
    # remaining minutes ~17
    tail = detail.split(":")[-1]
    assert tail.isdigit()
    assert int(tail) == 17, detail


def test_ok_00_31_wib(admin_token, temp_teacher, mongo):
    _ensure_baseline(admin_token)
    _clear_attendance(mongo, temp_teacher)
    # UTC 17:31Z == 00:31 WIB
    r = _attend("in", "2026-09-19T17:31:00Z")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "ok", j
    assert j["late_minutes"] == 0, j


def test_late_01_45_wib(admin_token, temp_teacher, mongo):
    _ensure_baseline(admin_token)
    _clear_attendance(mongo, temp_teacher)
    # UTC 18:45Z == 01:45 WIB (same local day 2026-09-20 since 17:31Z→00:31; 18:45Z→01:45)
    r = _attend("in", "2026-09-19T18:45:00Z")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "late", j
    assert j["late_minutes"] == 15, j


# ---------- FINAL: restore expected DB state ----------

def test_zzz_final_restore(admin_token):
    _ensure_baseline(admin_token)
    st = _get_settings(admin_token)
    for k, v in EXPECTED_FINAL.items():
        assert st.get(k) == v, (k, st)
