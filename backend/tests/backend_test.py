"""Comprehensive backend tests for Absensi Sekolah SaaS."""
import io
import os
import uuid
import base64
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://face-absensi-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "susyanto@gmail.com", "password": "Owner123!"}
ADMIN = {"email": "admin@nusantara.sch.id", "password": "Admin123!"}
TEACHER = {"email": "guru@nusantara.sch.id", "password": "Guru123!"}
KIOSK_CODE = "KIOSK-DEMO-1"

pytestmark = pytest.mark.xdist_group(name="demo_school_settings")


# Foto wajah asli untuk tes enroll/attend (matcher ArcFace butuh wajah nyata)
import base64 as _b64


def _load_photo(name: str) -> str:
    with open(f"/app/backend/tests/assets/{name}", "rb") as f:
        return f"data:image/jpeg;base64,{_b64.b64encode(f.read()).decode()}"


FACE_A = _load_photo("face_a.jpg")
FACE_B = _load_photo("face_b.jpg")  # wajah lain, tidak terdaftar
FACE_E = _load_photo("face_e.jpg")  # wajah khusus Budi (beda dari wajah tes lain)


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def owner_token():
    tok, _ = _login(OWNER)
    return tok


@pytest.fixture(scope="session")
def admin_token():
    tok, _ = _login(ADMIN)
    return tok


@pytest.fixture(scope="session")
def teacher_token():
    tok, _ = _login(TEACHER)
    return tok


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ------------------------------- AUTH -------------------------------
class TestAuth:
    def test_owner_login(self):
        tok, user = _login(OWNER)
        assert user["role"] == "owner"
        assert "password_hash" not in user
        assert "_id" not in user

    def test_admin_login(self):
        tok, user = _login(ADMIN)
        assert user["role"] == "school_admin"
        assert user.get("school_id")

    def test_teacher_login(self):
        tok, user = _login(TEACHER)
        assert user["role"] == "teacher"

    def test_invalid_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_endpoint(self, owner_token):
        r = requests.get(f"{API}/auth/me", headers=h(owner_token))
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ------------------------------- OWNER -------------------------------
class TestOwner:
    def test_overview(self, owner_token):
        r = requests.get(f"{API}/owner/overview", headers=h(owner_token))
        assert r.status_code == 200
        data = r.json()
        assert data["schools"] >= 1
        assert data["students"] >= 120

    def test_list_schools(self, owner_token):
        r = requests.get(f"{API}/owner/schools", headers=h(owner_token))
        assert r.status_code == 200
        schools = r.json()
        assert any(s.get("kiosk_token") == KIOSK_CODE for s in schools)
        demo = next(s for s in schools if s["kiosk_token"] == KIOSK_CODE)
        # student_count bisa berasal dari student_count_manual (billing) — jangan bergantung pada jumlah data hidup
        assert demo["student_count"] > 0
        assert demo.get("student_count_source") in ("manual", "data")

    def test_forbidden_for_non_owner(self, admin_token):
        r = requests.get(f"{API}/owner/overview", headers=h(admin_token))
        assert r.status_code == 403

    def test_create_school(self, owner_token):
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_School_{uniq}",
            "address": "Jl Test",
            "phone": "628123",
            "admin_name": "Test Admin",
            "admin_email": f"TEST_admin_{uniq}@test.example",
            "admin_password": "TestAdmin1!",
            "rate_per_student": 5000,
        }
        r = requests.post(f"{API}/owner/schools", json=payload, headers=h(owner_token))
        assert r.status_code == 200, r.text
        sch = r.json()
        assert sch["name"] == payload["name"]
        assert sch["kiosk_token"].startswith("KIOSK-")
        # verify via GET
        r2 = requests.get(f"{API}/owner/schools", headers=h(owner_token))
        assert any(s["id"] == sch["id"] for s in r2.json())
        # cleanup
        requests.delete(f"{API}/owner/schools/{sch['id']}", headers=h(owner_token))


# ------------------------------- INVOICES -------------------------------
TEST_PERIOD = "2099-12"  # periode khusus tes; selalu dibersihkan di teardown TestInvoices


@pytest.fixture(scope="session")
def test_period():
    return TEST_PERIOD


class TestInvoices:
    @classmethod
    def teardown_class(cls):
        from dotenv import dotenv_values
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        MongoClient(env["MONGO_URL"])[env["DB_NAME"]].invoices.delete_many({"period": TEST_PERIOD})
    def test_generate_invoices(self, owner_token, test_period):
        r = requests.post(
            f"{API}/owner/invoices/generate",
            json={"period": test_period, "send_email": False},
            headers=h(owner_token),
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] >= 1
        assert len(data["invoices"]) >= 1
        inv = data["invoices"][0]
        assert inv["status"] == "unpaid"
        assert inv["amount"] == inv["student_count"] * inv["rate"]

    def test_list_invoices_by_period(self, owner_token, test_period):
        r = requests.get(f"{API}/owner/invoices?period={test_period}", headers=h(owner_token))
        assert r.status_code == 200
        invs = r.json()
        assert len(invs) >= 1
        assert all(i["period"] == test_period for i in invs)
        assert all("school_name" in i for i in invs)

    def test_public_invoice_view(self, owner_token, test_period):
        invs = requests.get(f"{API}/owner/invoices?period={test_period}", headers=h(owner_token)).json()
        token = invs[0]["public_token"]
        r = requests.get(f"{API}/public/invoice/{token}")
        assert r.status_code == 200
        data = r.json()
        assert data["tripay_mode"] == "mock"
        assert data["invoice"]["public_token"] == token
        assert data["school"]["name"]

    def test_invoice_pdf(self, owner_token, test_period):
        invs = requests.get(f"{API}/owner/invoices?period={test_period}", headers=h(owner_token)).json()
        token = invs[0]["public_token"]
        r = requests.get(f"{API}/public/invoice/{token}/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_mock_pay(self, owner_token, test_period):
        invs = requests.get(f"{API}/owner/invoices?period={test_period}", headers=h(owner_token)).json()
        unpaid = [i for i in invs if i["status"] == "unpaid"]
        assert unpaid, "expected an unpaid invoice"
        token = unpaid[0]["public_token"]
        r = requests.post(f"{API}/public/invoice/{token}/mock-pay")
        assert r.status_code == 200
        assert r.json()["status"] == "paid"
        # verify persistence
        r2 = requests.get(f"{API}/public/invoice/{token}")
        assert r2.json()["invoice"]["status"] == "paid"

    def test_generate_idempotent(self, owner_token, test_period):
        # rerun should create 0
        r = requests.post(
            f"{API}/owner/invoices/generate",
            json={"period": test_period, "send_email": False},
            headers=h(owner_token),
        )
        assert r.status_code == 200
        assert r.json()["created"] == 0


# ------------------------------- ADMIN -------------------------------
class TestAdminStats:
    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["total_students"] >= 120
        assert data["total_teachers"] >= 1

    def test_admin_settings_get(self, admin_token):
        r = requests.get(f"{API}/admin/settings", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["school"]["kiosk_token"] == KIOSK_CODE
        # jam kerja bisa diubah user; assert bentuk field saja, bukan nilai bawaan
        assert isinstance(d["settings"]["work_start"], str) and d["settings"]["work_start"]

    def test_admin_settings_update(self, admin_token):
        cur = requests.get(f"{API}/admin/settings", headers=h(admin_token)).json()["settings"]
        r = requests.put(
            f"{API}/admin/settings",
            json={"work_start": "08:00", "work_end": "16:00", "late_tolerance_min": 15},
            headers=h(admin_token),
        )
        assert r.status_code == 200
        r2 = requests.get(f"{API}/admin/settings", headers=h(admin_token))
        s = r2.json()["settings"]
        assert s["work_start"] == "08:00"
        # restore ke nilai sebelum tes (bukan hardcode)
        requests.put(
            f"{API}/admin/settings",
            json={k: cur[k] for k in ("work_start", "work_end", "late_tolerance_min", "early_checkin_min", "timezone") if k in cur},
            headers=h(admin_token),
        )

    def test_add_location(self, admin_token):
        r = requests.post(
            f"{API}/admin/locations",
            json={"name": "TEST_loc", "lat": -6.2, "lng": 106.816666, "radius_m": 50},
            headers=h(admin_token),
        )
        assert r.status_code == 200
        lid = r.json()["id"]
        # cleanup
        d = requests.delete(f"{API}/admin/locations/{lid}", headers=h(admin_token))
        assert d.status_code == 200


class TestAdminTeachers:
    created_id = None

    def test_list_teachers(self, admin_token):
        r = requests.get(f"{API}/admin/teachers", headers=h(admin_token))
        assert r.status_code == 200
        teachers = r.json()
        assert len(teachers) >= 1
        assert all("email" in t and "enrolled" in t for t in teachers)

    def test_create_teacher(self, admin_token):
        uniq = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST Guru {uniq}",
            "email": f"TEST_guru_{uniq}@test.example",
            "password": "Guru123!",
            "nip": f"9{uniq}",
            "subject": "Fisika",
        }
        r = requests.post(f"{API}/admin/teachers", json=payload, headers=h(admin_token))
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["enrolled"] is False
        TestAdminTeachers.created_id = t["id"]

    def test_enroll_face(self, admin_token):
        assert TestAdminTeachers.created_id
        r = requests.post(
            f"{API}/admin/teachers/{TestAdminTeachers.created_id}/enroll",
            json={"photo": FACE_A},
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert r.json()["enrolled"] is True
        # verify enrolled in list
        lst = requests.get(f"{API}/admin/teachers", headers=h(admin_token)).json()
        row = next(t for t in lst if t["id"] == TestAdminTeachers.created_id)
        assert row["enrolled"] is True

    def test_enroll_duplicate_face_rejected(self, admin_token):
        # Budi mencoba enroll wajah yang sama dengan guru tes (FACE_A) -> 409
        teachers = requests.get(f"{API}/admin/teachers", headers=h(admin_token)).json()
        budi = next((t for t in teachers if "Budi" in t["name"]), None)
        if not budi:
            pytest.skip("Budi tidak ada")
        r = requests.post(
            f"{API}/admin/teachers/{budi['id']}/enroll",
            json={"photo": FACE_A},
            headers=h(admin_token),
        )
        assert r.status_code == 409, r.text
        assert "face_already_enrolled" in r.text, r.text

    def test_delete_teacher(self, admin_token):
        assert TestAdminTeachers.created_id
        r = requests.delete(f"{API}/admin/teachers/{TestAdminTeachers.created_id}", headers=h(admin_token))
        assert r.status_code == 200


class TestAdminStudents:
    def test_add_student(self, admin_token):
        payload = {"name": "TEST_Siswa", "nis": f"T{uuid.uuid4().hex[:6]}", "class_name": "X-1"}
        r = requests.post(f"{API}/admin/students", json=payload, headers=h(admin_token))
        assert r.status_code == 200
        st = r.json()
        assert st["name"] == "TEST_Siswa"
        requests.delete(f"{API}/admin/students/{st['id']}", headers=h(admin_token))

    def test_import_preview_and_commit(self, admin_token):
        uniq = uuid.uuid4().hex[:6]
        csv = f"name,nis,class\nTEST_A_{uniq},TN{uniq}1,XI-1\nTEST_B_{uniq},TN{uniq}2,XI-2\n,BAD,XI-3\n"
        files = {"file": (f"students_{uniq}.csv", csv, "text/csv")}
        r = requests.post(f"{API}/admin/students/import/preview", files=files, headers=h(admin_token))
        assert r.status_code == 200, r.text
        prev = r.json()
        assert len(prev["valid"]) == 2
        assert len(prev["errors"]) == 1
        r2 = requests.post(
            f"{API}/admin/students/import/commit",
            json={"rows": prev["valid"]},
            headers=h(admin_token),
        )
        assert r2.status_code == 200
        assert r2.json()["inserted"] == 2
        # cleanup: hapus siswa uji agar tidak mengotori jumlah siswa (basis billing)
        students = requests.get(f"{API}/admin/students", headers=h(admin_token)).json()
        for s in students:
            if str(s.get("nis", "")).startswith(f"TN{uniq}"):
                requests.delete(f"{API}/admin/students/{s['id']}", headers=h(admin_token))


# ------------------------------- LEAVES -------------------------------
class TestLeaves:
    leave_id = None

    def test_teacher_create_leave(self, teacher_token):
        payload = {
            "type": "izin",
            "date_from": "2026-01-15",
            "date_to": "2026-01-15",
            "reason": "TEST leave",
        }
        r = requests.post(f"{API}/teacher/leaves", json=payload, headers=h(teacher_token))
        assert r.status_code == 200, r.text
        TestLeaves.leave_id = r.json()["id"]
        assert r.json()["status"] == "pending"

    def test_admin_approve(self, admin_token):
        assert TestLeaves.leave_id
        r = requests.post(
            f"{API}/admin/leaves/{TestLeaves.leave_id}/decision",
            json={"status": "approved"},
            headers=h(admin_token),
        )
        assert r.status_code == 200

    def test_teacher_sees_approved(self, teacher_token):
        r = requests.get(f"{API}/teacher/leaves", headers=h(teacher_token))
        assert r.status_code == 200
        approved = [l for l in r.json() if l["id"] == TestLeaves.leave_id]
        assert approved and approved[0]["status"] == "approved"

    def test_zz_cleanup(self, admin_token):
        # bersihkan data uji agar tidak menumpuk di DB preview live
        assert TestLeaves.leave_id
        r = requests.delete(f"{API}/admin/leaves/{TestLeaves.leave_id}", headers=h(admin_token))
        assert r.status_code == 200


# ------------------------------- REPORTS -------------------------------
class TestReports:
    def test_report_json(self, admin_token):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = requests.get(
            f"{API}/admin/reports/attendance?date_from={today}&date_to={today}",
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_report_xlsx(self, admin_token):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = requests.get(
            f"{API}/admin/reports/export?format=xlsx&date_from={today}&date_to={today}",
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert r.content[:2] == b"PK"

    def test_report_pdf(self, admin_token):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = requests.get(
            f"{API}/admin/reports/export?format=pdf&date_from={today}&date_to={today}",
            headers=h(admin_token),
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"


# ------------------------------- KIOSK -------------------------------
class TestKiosk:
    def test_info_valid_token(self):
        r = requests.get(f"{API}/kiosk/info", headers={"X-Kiosk-Token": KIOSK_CODE})
        assert r.status_code == 200
        data = r.json()
        assert data["school"]["name"] == "SMA Nusantara (Demo)"
        assert len(data["locations"]) >= 1

    def test_info_invalid_token(self):
        r = requests.get(f"{API}/kiosk/info", headers={"X-Kiosk-Token": "BAD-CODE"})
        assert r.status_code == 401

    def test_attend_face_not_recognized(self, admin_token):
        # pastikan ada wajah terdaftar (Budi = FACE_A), lalu absen dengan wajah lain
        teachers = requests.get(f"{API}/admin/teachers", headers=h(admin_token)).json()
        budi = next(t for t in teachers if "Budi" in t["name"])
        r0 = requests.post(f"{API}/admin/teachers/{budi['id']}/enroll",
                           json={"photo": FACE_E}, headers=h(admin_token))
        assert r0.status_code == 200, r0.text
        body = {
            "photo": FACE_B,
            "lat": -6.2,
            "lng": 106.816666,
            "type": "in",
            "ts_device": "2099-01-01T05:00:00Z",
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend", json=body, headers={"X-Kiosk-Token": KIOSK_CODE})
        assert r.status_code == 422, r.text
        assert r.json().get("detail") == "face_not_found", r.text

    def test_attend_outside_geofence_requires_enrolled(self, admin_token):
        # Budi dipaksa enroll FACE_A agar match deterministik, lalu absen dari luar geofence
        teachers = requests.get(f"{API}/admin/teachers", headers=h(admin_token)).json()
        budi = next(t for t in teachers if "Budi" in t["name"])
        r0 = requests.post(
            f"{API}/admin/teachers/{budi['id']}/enroll",
            json={"photo": FACE_E},
            headers=h(admin_token),
        )
        assert r0.status_code == 200, r0.text
        body = {
            "photo": FACE_E,
            "lat": 0.0,  # far outside
            "lng": 0.0,
            "type": "in",
            "ts_device": "2099-01-02T05:00:00Z",  # tanggal jauh agar tidak kena duplikat 409
            "client_uuid": uuid.uuid4().hex,
        }
        r = requests.post(f"{API}/kiosk/attend", json=body, headers={"X-Kiosk-Token": KIOSK_CODE})
        assert r.status_code == 422, r.text
        assert "outside_geofence" in r.text, r.text
