"""Verify data-level bugfix: teacher account 'Budi Santoso' restored for demo school."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://face-absensi-2.preview.emergentagent.com").rstrip("/")

TEACHER_EMAIL = "guru@nusantara.sch.id"
TEACHER_PASS = "Guru123!"
ADMIN_EMAIL = "admin@nusantara.sch.id"
ADMIN_PASS = "Admin123!"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


def test_teacher_login_ok():
    r = _login(TEACHER_EMAIL, TEACHER_PASS)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["user"]["role"] == "teacher"
    assert data["user"]["email"] == TEACHER_EMAIL


def test_teacher_me_ok():
    r = _login(TEACHER_EMAIL, TEACHER_PASS)
    token = r.json()["token"]
    me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == TEACHER_EMAIL
    assert body.get("school_id")


def test_teacher_attendance_and_leaves():
    r = _login(TEACHER_EMAIL, TEACHER_PASS)
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    a = requests.get(f"{BASE_URL}/api/teacher/attendance", headers=h, timeout=15)
    assert a.status_code == 200, a.text
    lv = requests.get(f"{BASE_URL}/api/teacher/leaves", headers=h, timeout=15)
    assert lv.status_code == 200, lv.text


def test_admin_sees_both_teachers():
    r = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    lst = requests.get(f"{BASE_URL}/api/admin/teachers", headers=h, timeout=15)
    assert lst.status_code == 200, lst.text
    teachers = lst.json()
    names = [t.get("name", "") for t in teachers]
    assert any("Budi Santoso" in n for n in names), f"Budi missing: {names}"
    assert any("Susiyanto" in n or "Susyanto" in n for n in names), f"Susiyanto missing: {names}"
