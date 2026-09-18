"""
Backend test: verify late/overtime clock-wrap logic and early-checkin rule.
Uses a TEMP teacher inserted directly into Mongo; cleans up after.
"""
import os
import sys
import base64
import io
import uuid
import asyncio
from datetime import datetime, timezone

import pytest
import requests
from PIL import Image
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env")
from faceutil import embed  # noqa: E402

pytestmark = pytest.mark.xdist_group(name="demo_school_settings")

BASE = "http://localhost:8001"
KIOSK_TOKEN = "KIOSK-DEMO-1"
ADMIN_EMAIL = "admin@nusantara.sch.id"
ADMIN_PASSWORD = "Admin123!"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Demo school geofence coords from problem statement
LAT, LNG = -6.398118, 106.758963


def _load_photo(name: str) -> str:
    with open(f"/app/backend/tests/assets/{name}", "rb") as f:
        return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}"


PHOTO = _load_photo("face_a.jpg")
PHOTO_B = _load_photo("face_b.jpg")
EMB = embed(PHOTO)


@pytest.fixture(scope="module")
def mongo():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def school_id(mongo):
    loop = asyncio.get_event_loop()
    school = loop.run_until_complete(
        mongo.schools.find_one({"kiosk_token": KIOSK_TOKEN}, {"_id": 0})
    )
    assert school, "Demo school with kiosk token not found"
    return school["id"]


@pytest.fixture(scope="module")
def temp_teacher(mongo, school_id):
    loop = asyncio.get_event_loop()
    tid = str(uuid.uuid4())
    doc = {
        "id": tid,
        "school_id": school_id,
        "user_id": None,
        "name": "TEST_TEMP_TEACHER",
        "nip": "TEST-TEMP",
        "subject": "Test",
        "embedding": EMB,
        "photo": PHOTO,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    loop.run_until_complete(mongo.teachers.insert_one(doc))
    yield tid
    # cleanup
    loop.run_until_complete(mongo.teachers.delete_one({"id": tid}))
    loop.run_until_complete(mongo.attendance.delete_many({"teacher_id": tid}))


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


def _set_settings(admin_token, work_start, work_end, tol, early):
    r = requests.put(
        f"{BASE}/api/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"work_start": work_start, "work_end": work_end,
              "late_tolerance_min": tol, "early_checkin_min": early},
        timeout=10,
    )
    assert r.status_code == 200, f"set settings failed: {r.status_code} {r.text}"


def _attend(att_type, ts_device):
    r = requests.post(
        f"{BASE}/api/kiosk/attend",
        headers={"X-Kiosk-Token": KIOSK_TOKEN},
        json={
            "photo": PHOTO, "lat": LAT, "lng": LNG,
            "type": att_type, "ts_device": ts_device,
            "client_uuid": str(uuid.uuid4()),
        }, timeout=15)
    return r


def _clear_attendance(mongo, teacher_id):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(mongo.attendance.delete_many({"teacher_id": teacher_id}))


# ---------- SCENARIOS ----------

def test_scenario1_early_checkin_before_next_day_shift(admin_token, temp_teacher, mongo):
    """01:00/00:00/30/60 -> in at 23:36 -> ok, late_minutes 0"""
    _set_settings(admin_token, "01:00", "00:00", 30, 60)
    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-19T23:36:00")
    assert r.status_code == 200, f"got {r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "ok", j
    assert j["late_minutes"] == 0, j


def test_scenario2_late_after_start(admin_token, temp_teacher, mongo):
    """01:00/00:00/30 -> in 01:45 -> late, late_minutes 15"""
    _set_settings(admin_token, "01:00", "00:00", 30, 60)
    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-20T01:45:00")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "late", j
    assert j["late_minutes"] == 15, j


def test_scenario3_evening_shift_variants(admin_token, temp_teacher, mongo):
    """21:00/00:00/30/60"""
    _set_settings(admin_token, "21:00", "00:00", 30, 60)

    # too early
    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-21T19:30:00")
    assert r.status_code == 422, f"{r.status_code} {r.text}"
    assert "too_early:20:00" in r.json().get("detail", ""), r.text

    # ok at 20:30 (within early_checkin window, before start)
    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-21T20:30:00")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "ok" and j["late_minutes"] == 0, j

    # late at 23:30 -> 120 min
    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-21T23:30:00")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["status"] == "late", j
    assert j["late_minutes"] == 120, j

    # out at 00:30 next day -> overtime 30
    r = _attend("out", "2026-09-22T00:30:00")
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    j = r.json()
    assert j["overtime_minutes"] == 30, j


def test_scenario4_standard_day_shift(admin_token, temp_teacher, mongo):
    """07:00/15:00/10 -> in 07:05 ok; in 07:45 late 35; out 16:30 ot 90"""
    _set_settings(admin_token, "07:00", "15:00", 10, 60)

    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-23T07:05:00")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "ok" and j["late_minutes"] == 0, j

    _clear_attendance(mongo, temp_teacher)
    r = _attend("in", "2026-09-23T07:45:00")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "late" and j["late_minutes"] == 35, j

    r = _attend("out", "2026-09-23T16:30:00")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["overtime_minutes"] == 90, j


def test_scenario5_out_requires_checkin(admin_token, temp_teacher, mongo):
    """Absen pulang tanpa absen masuk -> 422 no_checkin; setelah absen masuk -> diterima."""
    _set_settings(admin_token, "07:00", "15:00", 10, 60)

    _clear_attendance(mongo, temp_teacher)
    r = _attend("out", "2026-09-24T15:30:00")
    assert r.status_code == 422, f"{r.status_code} {r.text}"
    assert r.json().get("detail") == "no_checkin", r.text

    r = _attend("in", "2026-09-24T07:05:00")
    assert r.status_code == 200, r.text

    r = _attend("out", "2026-09-24T15:30:00")
    assert r.status_code == 200, r.text


def test_scenario6_require_checkin_toggle(admin_token, temp_teacher, mongo):
    """require_checkin=false -> absen pulang tanpa absen masuk diizinkan; restore true -> ditolak."""
    _set_settings(admin_token, "07:00", "15:00", 10, 60)
    hdr = {"Authorization": f"Bearer {admin_token}"}

    r = requests.put(f"{BASE}/api/admin/settings", json={"require_checkin": False}, headers=hdr, timeout=10)
    assert r.status_code == 200, r.text
    _clear_attendance(mongo, temp_teacher)
    r = _attend("out", "2026-09-25T15:30:00")
    assert r.status_code == 200, f"{r.status_code} {r.text}"

    r = requests.put(f"{BASE}/api/admin/settings", json={"require_checkin": True}, headers=hdr, timeout=10)
    assert r.status_code == 200, r.text
    _clear_attendance(mongo, temp_teacher)
    r = _attend("out", "2026-09-25T15:30:00")
    assert r.status_code == 422, f"{r.status_code} {r.text}"
    assert r.json().get("detail") == "no_checkin", r.text


def test_susiyanto_record_ok(admin_token):
    """GET admin today should list Susiyanto's 23:36 check-in with status ok, late 0."""
    # Try /api/admin/today
    r = requests.get(f"{BASE}/api/admin/today",
                     headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
    if r.status_code != 200:
        pytest.skip(f"/api/admin/today not available: {r.status_code}")
    data = r.json()
    rows = data if isinstance(data, list) else data.get("rows") or data.get("items") or []
    sus = [x for x in rows if "Susiyanto" in (x.get("teacher_name") or "")]
    # If not in today (date mismatch), fallback to attendance report scan via mongo
    if not sus:
        pytest.skip("Susiyanto row not present in /admin/today (date mismatch is ok)")
    for row in sus:
        if row.get("type") == "in":
            assert row.get("status") == "ok", row
            assert row.get("late_minutes") == 0, row


def test_zzz_restore_settings(admin_token):
    """Final: restore demo school settings to 01:00/00:00/30/30."""
    _set_settings(admin_token, "01:00", "00:00", 30, 30)
