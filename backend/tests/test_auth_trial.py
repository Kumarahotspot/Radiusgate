"""Trial registration + password reset flow (auth baru: forgot/reset/register-trial)."""
import asyncio
import hashlib
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

pytestmark = pytest.mark.xdist_group(name="auth_trial")
BASE = "http://localhost:8001"
API = f"{BASE}/api"

TRIAL_EMAIL = f"testtrial_{uuid.uuid4().hex[:6]}@test.sch.id"
TRIAL_PW = "TrialPass123!"
NEW_PW = "NewTrialPass456!"


@pytest.fixture(scope="module")
def mongo():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _run(mongo, coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _now():
    return datetime.now(timezone.utc).isoformat()


class TestAuthTrial:
    _school_id = None
    _user_id = None

    def test_register_trial_creates_tenant(self, mongo):
        r = requests.post(f"{API}/auth/register-trial", json={
            "school_name": "TEST Trial School", "admin_name": "TEST Admin",
            "email": TRIAL_EMAIL, "password": TRIAL_PW, "student_count": 120,
        }, timeout=30)
        assert r.status_code == 200, r.text
        school = _run(mongo, mongo.schools.find_one({"admin_email": TRIAL_EMAIL}))
        assert school and school["trial"] is True and school["trial_ends_at"] > _now()
        assert school["kiosk_token"].startswith("KIOSK-")
        user = _run(mongo, mongo.users.find_one({"email": TRIAL_EMAIL}))
        assert user and user["role"] == "school_admin" and user["school_id"] == school["id"]
        lead = _run(mongo, mongo.leads.find_one({"email": TRIAL_EMAIL}))
        assert lead and lead["source"] == "self_service_trial" and lead["status"] == "new"
        TestAuthTrial._school_id = school["id"]
        TestAuthTrial._user_id = user["id"]

    def test_register_trial_duplicate_email(self):
        r = requests.post(f"{API}/auth/register-trial", json={
            "school_name": "TEST Dup", "admin_name": "TEST", "email": TRIAL_EMAIL, "password": TRIAL_PW,
        }, timeout=30)
        assert r.status_code == 400 and r.json().get("detail") == "email_taken", r.text

    def test_trial_login_ok(self):
        r = requests.post(f"{API}/auth/login", json={"email": TRIAL_EMAIL, "password": TRIAL_PW}, timeout=30)
        assert r.status_code == 200 and r.json()["token"], r.text

    def test_forgot_password_neutral(self, mongo):
        # email tak dikenal tetap 200 (anti enumeration)
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "takada@nowhere.sch.id"}, timeout=30)
        assert r.status_code == 200 and r.json()["ok"], r.text
        r = requests.post(f"{API}/auth/forgot-password", json={"email": TRIAL_EMAIL}, timeout=60)
        assert r.status_code == 200 and r.json()["ok"], r.text
        tok = _run(mongo, mongo.password_reset_tokens.find_one({"user_id": TestAuthTrial._user_id}))
        assert tok and tok["used"] is False and tok["expires_at"] > _now()
        assert "token" not in tok  # hanya hash yang disimpan

    def test_reset_password_flow(self, mongo):
        raw = "testraw-" + uuid.uuid4().hex
        _run(mongo, mongo.password_reset_tokens.insert_one({
            "token_hash": hashlib.sha256(raw.encode()).hexdigest(),
            "user_id": TestAuthTrial._user_id, "created_at": _now(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "used": False,
        }))
        # password terlalu pendek -> 422
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "new_password": "123"}, timeout=30)
        assert r.status_code == 422, r.text
        # reset sukses
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "new_password": NEW_PW}, timeout=30)
        assert r.status_code == 200, r.text
        # token tidak bisa dipakai ulang
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw, "new_password": "Whatever789!"}, timeout=30)
        assert r.status_code == 400, r.text
        # token kadaluwarsa -> 400
        raw2 = "testexpired-" + uuid.uuid4().hex
        _run(mongo, mongo.password_reset_tokens.insert_one({
            "token_hash": hashlib.sha256(raw2.encode()).hexdigest(),
            "user_id": TestAuthTrial._user_id, "created_at": _now(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(), "used": False,
        }))
        r = requests.post(f"{API}/auth/reset-password", json={"token": raw2, "new_password": "Whatever789!"}, timeout=30)
        assert r.status_code == 400, r.text
        # password lama gagal, baru berhasil
        r = requests.post(f"{API}/auth/login", json={"email": TRIAL_EMAIL, "password": TRIAL_PW}, timeout=30)
        assert r.status_code == 401, r.text
        r = requests.post(f"{API}/auth/login", json={"email": TRIAL_EMAIL, "password": NEW_PW}, timeout=30)
        assert r.status_code == 200, r.text

    def test_trial_expired_blocks_login(self, mongo):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        _run(mongo, mongo.schools.update_one({"id": TestAuthTrial._school_id}, {"$set": {"trial_ends_at": past}}))
        r = requests.post(f"{API}/auth/login", json={"email": TRIAL_EMAIL, "password": NEW_PW}, timeout=30)
        assert r.status_code == 403 and r.json().get("detail") == "trial_expired", r.text

    def test_zz_cleanup(self, mongo):
        _run(mongo, mongo.schools.delete_one({"id": TestAuthTrial._school_id}))
        _run(mongo, mongo.settings.delete_one({"school_id": TestAuthTrial._school_id}))
        _run(mongo, mongo.users.delete_one({"id": TestAuthTrial._user_id}))
        _run(mongo, mongo.leads.delete_many({"email": TRIAL_EMAIL}))
        _run(mongo, mongo.password_reset_tokens.delete_many({"user_id": TestAuthTrial._user_id}))
        assert _run(mongo, mongo.users.find_one({"email": TRIAL_EMAIL})) is None
