"""Tests for v2 features: student kiosk attend, offline sync, student PATCH, admin stats students_present."""
import asyncio
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@nusantara.sch.id", "password": "Admin123!"}
KIOSK_CODE = "KIOSK-DEMO-1"
KIOSK_HDR = {"X-Kiosk-Token": KIOSK_CODE}

GEO_OK = {"lat": -6.398118, "lng": 106.758963}
GEO_FAR = {"lat": -6.3, "lng": 107.0}

pytestmark = pytest.mark.xdist_group(name="demo_school_settings")


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


def _fetch_students(tok):
    return requests.get(f"{API}/admin/students", headers=h(tok)).json()


def _pick_student_by_nis(students, nis):
    return next((s for s in students if str(s.get("nis", "")) == str(nis)), None)


def _cleanup_attendance(admin_token, student_ids):
    if not student_ids:
        return
    rows = requests.get(f"{API}/admin/today", headers=h(admin_token)).json()
    for r in rows:
        if r.get("person_type") == "student" and r.get("student_id") in student_ids:
            requests.delete(f"{API}/admin/attendance/{r['id']}", headers=h(admin_token))


# Dedicated test student (created by fixture) so tests don't depend on deletable demo rows.
NIS_TEST = "TEST-KIOSK-1"
NIS_GEOFENCE = "10050"
NIS_SAKIT = "10060"
NIS_SYNC = "10080"
NIS_PATCH = "10120"  # last one - unlikely to be used elsewhere


@pytest.fixture(scope="module")
def kiosk_student(admin_token):
    """Create a dedicated test student; remove its attendance & row afterwards."""
    s = _pick_student_by_nis(_fetch_students(admin_token), NIS_TEST)
    if not s:
        r = requests.post(f"{API}/admin/students",
                          json={"name": "TEST_SISWA_KIOSK", "nis": NIS_TEST, "class_name": "TEST"},
                          headers=h(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        s = _pick_student_by_nis(_fetch_students(admin_token), NIS_TEST)
    assert s, "failed to create test student"
    yield s
    client = AsyncIOMotorClient(MONGO_URL)
    mdb = client[DB_NAME]
    loop = asyncio.get_event_loop()
    loop.run_until_complete(mdb.attendance.delete_many({"student_id": s["id"]}))
    loop.run_until_complete(mdb.students.delete_one({"id": s["id"]}))
    client.close()


class TestStudentKiosk:
    _present_id = None
    _sakit_id = None

    def test_attend_valid_present(self, admin_token, kiosk_student):
        _cleanup_attendance(admin_token, [kiosk_student["id"]])
        TestStudentKiosk._present_id = kiosk_student["id"]
        body = {
            "nis": kiosk_student["nis"],
            "status": "present",
            "lat": GEO_OK["lat"], "lng": GEO_OK["lng"],
            "ts_device": datetime.now(timezone.utc).isoformat(),
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend-student", json=body, headers=KIOSK_HDR)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "student_name" in data and data["student_name"]
        assert data["att_status"] == "present"

    def test_attend_duplicate_same_day(self, kiosk_student):
        body = {
            "nis": kiosk_student["nis"],
            "status": "present",
            "lat": GEO_OK["lat"], "lng": GEO_OK["lng"],
            "ts_device": datetime.now(timezone.utc).isoformat(),
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend-student", json=body, headers=KIOSK_HDR)
        assert r.status_code == 409
        assert "already_recorded" in r.text

    def test_attend_invalid_nis(self):
        body = {
            "nis": "NOTEXIST_99999",
            "status": "present",
            "lat": GEO_OK["lat"], "lng": GEO_OK["lng"],
            "ts_device": datetime.now(timezone.utc).isoformat(),
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend-student", json=body, headers=KIOSK_HDR)
        assert r.status_code == 422
        assert "student_not_found" in r.text

    def test_attend_outside_geofence(self, admin_token):
        students = _fetch_students(admin_token)
        s = _pick_student_by_nis(students, NIS_GEOFENCE)
        _cleanup_attendance(admin_token, [s["id"]])
        body = {
            "nis": NIS_GEOFENCE,
            "status": "present",
            "lat": GEO_FAR["lat"], "lng": GEO_FAR["lng"],
            "ts_device": datetime.now(timezone.utc).isoformat(),
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend-student", json=body, headers=KIOSK_HDR)
        assert r.status_code == 422, r.text
        assert "outside_geofence" in r.text

    def test_attend_sakit_no_late(self, admin_token):
        students = _fetch_students(admin_token)
        s = _pick_student_by_nis(students, NIS_SAKIT)
        _cleanup_attendance(admin_token, [s["id"]])
        TestStudentKiosk._sakit_id = s["id"]
        body = {
            "nis": NIS_SAKIT,
            "status": "sakit",
            "lat": GEO_OK["lat"], "lng": GEO_OK["lng"],
            "ts_device": datetime.now(timezone.utc).isoformat(),
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend-student", json=body, headers=KIOSK_HDR)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["att_status"] == "sakit"
        assert data["status"] == "ok"
        assert data["late_minutes"] == 0

    def test_zzz_cleanup(self, admin_token):
        ids = [TestStudentKiosk._present_id, TestStudentKiosk._sakit_id]
        _cleanup_attendance(admin_token, [i for i in ids if i])


class TestStudentSync:
    def test_sync_and_dedupe(self, admin_token):
        students = _fetch_students(admin_token)
        s = _pick_student_by_nis(students, NIS_SYNC)
        assert s, f"student {NIS_SYNC} not found"
        _cleanup_attendance(admin_token, [s["id"]])
        payload = {
            "records": [{
                "person_type": "student",
                "nis": NIS_SYNC,
                "status": "izin",
                "lat": GEO_OK["lat"], "lng": GEO_OK["lng"],
                "ts_device": datetime.now(timezone.utc).isoformat(),
                "client_uuid": uuid.uuid4().hex,
            }]
        }
        r = requests.post(f"{API}/kiosk/sync", json=payload, headers=KIOSK_HDR)
        assert r.status_code == 200, r.text
        res = r.json()["results"][0]
        assert res["ok"] is True

        r2 = requests.post(f"{API}/kiosk/sync", json=payload, headers=KIOSK_HDR)
        assert r2.status_code == 200
        res2 = r2.json()["results"][0]
        assert res2["ok"] is False
        assert res2["reason"] == "already_recorded"

        _cleanup_attendance(admin_token, [s["id"]])


class TestStudentPatch:
    def test_patch_and_restore(self, admin_token):
        students = _fetch_students(admin_token)
        s = _pick_student_by_nis(students, NIS_PATCH)
        assert s, f"student {NIS_PATCH} not found"
        orig_name, orig_class = s["name"], s.get("class", "")
        new_name = f"{orig_name}_EDIT"
        new_class = "TEST_KELAS"
        r = requests.patch(f"{API}/admin/students/{s['id']}",
                           json={"name": new_name, "class_name": new_class}, headers=h(admin_token))
        assert r.status_code == 200, r.text
        updated = _pick_student_by_nis(_fetch_students(admin_token), NIS_PATCH)
        assert updated["name"] == new_name
        assert updated["class"] == new_class
        # restore
        r2 = requests.patch(f"{API}/admin/students/{s['id']}",
                            json={"name": orig_name, "class_name": orig_class}, headers=h(admin_token))
        assert r2.status_code == 200
        restored = _pick_student_by_nis(_fetch_students(admin_token), NIS_PATCH)
        assert restored["name"] == orig_name
        assert restored.get("class", "") == orig_class

    def test_patch_unknown_id(self, admin_token):
        r = requests.patch(f"{API}/admin/students/nonexistent-id-xyz",
                           json={"name": "X"}, headers=h(admin_token))
        assert r.status_code == 404


class TestAdminStatsStudents:
    def test_stats_has_students_present(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "students_present" in d
        assert isinstance(d["students_present"], int)
        assert d["students_present"] >= 0
        assert isinstance(d["present_today"], int)
