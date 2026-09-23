from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import db
from auth import require_roles
from notif import get_notif_settings, send_email_unified, send_whatsapp

router = APIRouter(tags=["notif"])
owner_dep = require_roles("owner")

SECRET_FIELDS = ("smtp_password", "wablas_token", "wablas_secret_key")


@router.get("/owner/notif-settings")
async def get_settings(user: dict = Depends(owner_dep)):
    cfg = await get_notif_settings()
    for f in SECRET_FIELDS:
        cfg[f + "_set"] = bool(cfg.get(f))
        cfg.pop(f, None)
    return cfg


class NotifIn(BaseModel):
    email_mode: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str | None = None
    smtp_tls: bool | None = None
    wa_provider: str | None = None
    wablas_base_url: str | None = None
    wablas_token: str | None = None
    wablas_secret_key: str | None = None


@router.put("/owner/notif-settings")
async def put_settings(body: NotifIn, user: dict = Depends(owner_dep)):
    if body.email_mode and body.email_mode not in ("resend", "smtp"):
        raise HTTPException(status_code=400, detail="Mode email tidak valid")
    if body.wa_provider and body.wa_provider not in ("link", "wablas"):
        raise HTTPException(status_code=400, detail="Provider WA tidak valid")
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    for f in SECRET_FIELDS:
        if f in upd and not upd[f]:
            upd.pop(f)  # kosong = tidak diubah
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    upd["id"] = "global"
    await db.notif_settings.update_one({"id": "global"}, {"$set": upd}, upsert=True)
    return {"ok": True}


class TestIn(BaseModel):
    channel: str  # email | whatsapp
    to: str


@router.post("/owner/notif-settings/test")
async def test_send(body: TestIn, user: dict = Depends(owner_dep)):
    if body.channel == "email":
        used = await send_email_unified(
            to=body.to, subject="Tes Email - RadiusGate",
            html='<p>Ini email tes dari <strong>RadiusGate</strong>. Konfigurasi email berhasil.</p>')
        return {"ok": True, "via": used}
    if body.channel == "whatsapp":
        res = await send_whatsapp(body.to, "Tes WhatsApp dari RadiusGate. Konfigurasi berhasil.")
        return {"ok": True, **res}
    raise HTTPException(status_code=400, detail="Channel tidak valid")
