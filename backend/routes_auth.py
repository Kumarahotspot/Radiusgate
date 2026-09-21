import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from html import escape

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from db import db
from auth import verify_password, hash_password, create_token, get_current_user
from emailer import send_email
from notif import normalize_phone

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
TRIAL_DAYS = 14


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class LoginIn(BaseModel):
    email: str  # email, atau no. HP untuk akun orang tua
    password: str


@router.post("/auth/login")
async def login(body: LoginIn):
    ident = body.email.strip()
    if "@" in ident:
        user = await db.users.find_one({"email": ident.lower()})
    else:
        user = await db.users.find_one({"phone": normalize_phone(ident), "role": "parent"})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    if user.get("school_id"):
        school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "trial_ends_at": 1})
        if school and school.get("trial_ends_at") and school["trial_ends_at"] < now_iso():
            raise HTTPException(status_code=403, detail="trial_expired")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": create_token(user), "user": user}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="password_too_short")
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="wrong_current_password")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


class ForgotIn(BaseModel):
    email: EmailStr


@router.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn):
    """Selalu 200 agar tidak mengungkap email terdaftar. Token disimpan sebagai hash, berlaku 1 jam."""
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "user_id": user["id"],
            "created_at": now_iso(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
        })
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        try:
            await send_email(
                to=user["email"],
                subject="Reset Password EduGateID",
                html=(
                    '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1a1a1a">'
                    '<h2 style="margin:0 0 8px;color:#0F766E">Reset Password</h2>'
                    f'<p>Halo <strong>{escape(user.get("name", ""))}</strong>,</p>'
                    '<p>Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah (berlaku 1 jam):</p>'
                    f'<p><a href="{link}" style="display:inline-block;background:#0F766E;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a></p>'
                    '<p style="font-size:12px;color:#888;margin-top:16px">Abaikan email ini jika Anda tidak meminta reset password.</p>'
                    "</td></tr></table>"
                ),
            )
        except Exception:
            logger.exception("forgot-password email gagal terkirim")
    return {"ok": True}


class ResetIn(BaseModel):
    token: str
    new_password: str


@router.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="password_too_short")
    th = hashlib.sha256(body.token.encode()).hexdigest()
    doc = await db.password_reset_tokens.find_one({"token_hash": th, "used": False})
    if not doc or doc["expires_at"] < now_iso():
        raise HTTPException(status_code=400, detail="invalid_or_expired")
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
    return {"ok": True}


class TrialIn(BaseModel):
    school_name: str
    admin_name: str
    email: EmailStr
    password: str
    student_count: int | None = None
    school_type: str = ""
    majors: list[str] = []


@router.post("/auth/register-trial")
async def register_trial(body: TrialIn):
    """Self-service trial: buat sekolah + admin, masa aktif 14 hari, tercatat sebagai lead."""
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="password_too_short")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="email_taken")
    sid = str(uuid.uuid4())
    trial_ends = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()
    await db.schools.insert_one({
        "id": sid, "name": body.school_name, "address": "", "phone": "",
        "admin_email": body.email.lower(), "rate_per_student": 8000,
        "student_count_manual": body.student_count,
        "kiosk_token": "KIOSK-" + uuid.uuid4().hex[:8].upper(),
        "trial": True, "trial_ends_at": trial_ends, "created_at": now_iso(),
    })
    st_doc = {"school_id": sid, "work_start": "07:00", "work_end": "15:00",
              "late_tolerance_min": 10, "early_checkin_min": 60, "timezone": "Asia/Jakarta"}
    if body.school_type:
        st_doc["school_type"] = body.school_type
    majors = [m.strip() for m in body.majors if m.strip()]
    if majors:
        st_doc["major_list"] = majors
    await db.settings.insert_one(st_doc)
    await db.users.insert_one({
        "id": str(uuid.uuid4()), "email": body.email.lower(), "name": body.admin_name,
        "role": "school_admin", "password_hash": hash_password(body.password),
        "school_id": sid, "created_at": now_iso(),
    })
    await db.leads.insert_one({
        "id": str(uuid.uuid4()), "school_name": body.school_name, "contact_person": body.admin_name,
        "email": body.email.lower(), "phone": "", "student_count": body.student_count,
        "school_type": body.school_type, "majors": majors,
        "message": "Mendaftar self-service trial", "source": "self_service_trial",
        "status": "new", "school_id": sid, "created_at": now_iso(),
    })
    try:
        login_url = f"{FRONTEND_URL}/login?email={body.email.lower()}"
        await send_email(
            to=body.email.lower(),
            subject="Selamat Datang di EduGateID — Akun Trial Aktif",
            html=(
                '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1a1a1a">'
                '<h2 style="margin:0 0 8px;color:#0F766E">Selamat Datang di EduGateID!</h2>'
                f'<p>Akun trial <strong>{escape(body.school_name)}</strong> aktif selama {TRIAL_DAYS} hari (s/d {trial_ends[:10]}).</p>'
                '<table style="border-collapse:collapse;margin:12px 0">'
                f'<tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td style="padding:6px 0"><strong>{escape(body.email.lower())}</strong></td></tr>'
                f'<tr><td style="padding:6px 16px 6px 0;color:#666">Password</td><td style="padding:6px 0"><strong>{escape(body.password)}</strong></td></tr>'
                '</table>'
                f'<p><a href="{login_url}" style="display:inline-block;background:#0F766E;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Masuk Portal Admin</a></p>'
                '<p style="font-size:12px;color:#888;margin-top:16px">EduGateID oleh PT. Pusaka Kreasi Mandiri.</p>'
                "</td></tr></table>"
            ),
        )
    except Exception:
        logger.exception("welcome email trial gagal terkirim")
    return {"ok": True}
