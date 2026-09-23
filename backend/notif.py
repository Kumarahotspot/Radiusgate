import re
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from db import db
from emailer import send_email

DEFAULTS = {
    "id": "global",
    "email_mode": "resend",  # resend (managed) | smtp (kustom)
    "smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": "",
    "smtp_from_email": "", "smtp_from_name": "", "smtp_tls": True,
    "wa_provider": "link",  # link (wa.me manual) | wablas (otomatis)
    "wablas_base_url": "https://www.wablas.com", "wablas_token": "", "wablas_secret_key": "",
}


async def get_notif_settings() -> dict:
    doc = await db.notif_settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        return dict(DEFAULTS)
    return {**DEFAULTS, **doc}


def normalize_phone(p: str) -> str:
    p = re.sub(r"[\s\-]", "", p or "")
    if p.startswith("+"):
        p = p[1:]
    if p.startswith("0"):
        p = "62" + p[1:]
    return p


def _smtp_send(cfg: dict, to: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    from_email = cfg.get("smtp_from_email") or cfg.get("smtp_user")
    msg["From"] = f"{cfg.get('smtp_from_name') or 'RadiusGate'} <{from_email}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    port = int(cfg.get("smtp_port") or 587)
    if cfg.get("smtp_tls", True):
        server = smtplib.SMTP(cfg["smtp_host"], port, timeout=20)
        server.starttls()
    else:
        server = smtplib.SMTP_SSL(cfg["smtp_host"], port or 465, timeout=20)
    try:
        if cfg.get("smtp_user"):
            server.login(cfg["smtp_user"], cfg.get("smtp_password", ""))
        server.sendmail(from_email, [to], msg.as_string())
    finally:
        server.quit()


async def send_email_unified(*, to: str, subject: str, html: str):
    cfg = await get_notif_settings()
    if cfg.get("email_mode") == "smtp":
        if not cfg.get("smtp_host"):
            raise HTTPException(status_code=400, detail="SMTP belum dikonfigurasi")
        await asyncio.to_thread(_smtp_send, cfg, to, subject, html)
        return "smtp"
    return await send_email(to=to, subject=subject, html=html)


async def send_whatsapp(phone: str, message: str, doc_url: str | None = None) -> dict:
    cfg = await get_notif_settings()
    phone = normalize_phone(phone)
    if cfg.get("wa_provider") != "wablas" or not cfg.get("wablas_token"):
        return {"mode": "link", "wa_link": f"https://wa.me/{phone}?text={quote(message)}"}
    base = (cfg.get("wablas_base_url") or "https://www.wablas.com").rstrip("/")
    auth = cfg["wablas_token"]
    if cfg.get("wablas_secret_key"):
        auth = f"{auth}.{cfg['wablas_secret_key']}"
    headers = {"Authorization": auth, "Content-Type": "application/x-www-form-urlencoded"}
    out = {"mode": "wablas"}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(f"{base}/api/send-message", headers=headers,
                                 data={"phone": phone, "message": message[:1024]})
        out["message_status"] = resp.status_code
        try:
            out["message_result"] = resp.json()
        except Exception:
            out["message_result"] = resp.text[:300]
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Wablas error {resp.status_code}")
        if doc_url:
            resp2 = await client.post(f"{base}/api/send-document", headers=headers,
                                      data={"phone": phone, "document": doc_url, "caption": ""})
            out["doc_status"] = resp2.status_code
    return out
