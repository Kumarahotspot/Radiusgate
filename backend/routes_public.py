import logging
import uuid
from datetime import datetime, timezone
from html import escape

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

from db import db
from emailer import send_email

router = APIRouter()
logger = logging.getLogger(__name__)


class LeadIn(BaseModel):
    school_name: str
    contact_person: str
    email: EmailStr
    phone: str = ""
    student_count: int | None = None
    message: str = ""


@router.post("/public/leads")
async def create_lead(body: LeadIn):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["status"] = "new"
    await db.leads.insert_one(doc)
    owner = await db.users.find_one({"role": "owner"}, {"_id": 0, "email": 1})
    if owner:
        try:
            rows = "".join(
                f'<tr><td style="padding:4px 12px 4px 0;color:#666">{k}</td>'
                f'<td style="padding:4px 0"><strong>{v}</strong></td></tr>'
                for k, v in [
                    ("Sekolah", escape(doc["school_name"])),
                    ("Penanggung Jawab", escape(doc["contact_person"])),
                    ("Email", escape(doc["email"])),
                    ("WhatsApp", escape(doc.get("phone") or "-")),
                    ("Jumlah Siswa", doc.get("student_count") or "-"),
                    ("Pesan", escape(doc.get("message") or "-")),
                ]
            )
            await send_email(
                to=owner["email"],
                subject=f"Pengajuan Pilot Baru: {doc['school_name']}",
                html=(
                    '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1a1a1a">'
                    '<h2 style="margin:0 0 8px;color:#0F766E">Pengajuan Pilot Baru</h2>'
                    '<p>Ada sekolah yang mendaftar lewat halaman landing RadiusGate:</p>'
                    f'<table style="border-collapse:collapse;margin:12px 0">{rows}</table>'
                    '<p style="font-size:12px;color:#888;margin-top:16px">Lihat detail di Portal Owner &rarr; Pengajuan Pilot.</p>'
                    "</td></tr></table>"
                ),
            )
        except Exception:
            logger.exception("lead notification email gagal terkirim")
    return {"ok": True}


@router.get("/public/download/landing-page")
async def download_landing_page():
    return FileResponse("/app/frontend/landing-radiusgate.zip", media_type="application/zip",
                        filename="landing-radiusgate.zip")


@router.get("/public/download/presentasi")
async def download_presentasi():
    return FileResponse("/app/frontend/presentasi-radiusgate.pptx",
                        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        filename="presentasi-radiusgate.pptx")


@router.get("/public/download/panduan")
async def download_panduan():
    return FileResponse("/app/frontend/panduan-radiusgate.pdf", media_type="application/pdf",
                        filename="panduan-radiusgate.pdf")


@router.get("/public/download/panduan-vps")
async def download_panduan_vps():
    return FileResponse("/app/PANDUAN-VPS.md", media_type="text/markdown",
                        filename="PANDUAN-VPS.md")


@router.get("/public/download/install-script")
async def download_install_script():
    return FileResponse("/app/install-vps.sh", media_type="text/x-sh",
                        filename="install-vps.sh")


@router.get("/public/download/backup-database")
async def download_backup_database():
    return FileResponse("/app/frontend/radiusgate_backup_database.tar.gz",
                        media_type="application/gzip",
                        filename="radiusgate_backup_database.tar.gz")


@router.get("/public/download/restore-script")
async def download_restore_script():
    return FileResponse("/app/restore-db.sh", media_type="text/x-sh",
                        filename="restore-db.sh")
