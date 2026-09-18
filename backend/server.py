import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from db import db, client  # noqa: E402
from auth import hash_password, verify_password  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from routes_owner import router as owner_router  # noqa: E402
from routes_admin import router as admin_router  # noqa: E402
from routes_teacher import router as teacher_router  # noqa: E402
from routes_kiosk import router as kiosk_router  # noqa: E402
from routes_billing import router as billing_router  # noqa: E402

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth_router, owner_router, admin_router, teacher_router, kiosk_router, billing_router):
    app.include_router(r, prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.attendance.create_index("client_uuid", unique=True, sparse=True)
    await db.invoices.create_index([("school_id", 1), ("period", 1)], unique=True)
    await seed()


async def seed():
    owner_email = os.environ["OWNER_EMAIL"].lower()
    owner_pw = os.environ["OWNER_PASSWORD"]
    existing = await db.users.find_one({"email": owner_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": owner_email, "name": "Platform Owner",
            "role": "owner", "password_hash": hash_password(owner_pw),
            "school_id": None, "created_at": now_iso()})
        logger.info("Owner seeded: %s", owner_email)
    elif not verify_password(owner_pw, existing["password_hash"]):
        await db.users.update_one({"email": owner_email}, {"$set": {"password_hash": hash_password(owner_pw)}})

    if await db.schools.find_one({"kiosk_token": "KIOSK-DEMO-1"}):
        return
    sid = str(uuid.uuid4())
    await db.schools.insert_one({
        "id": sid, "name": "SMA Nusantara (Demo)", "address": "Jl. Pendidikan No. 1, Jakarta",
        "phone": "6281234567890", "admin_email": "admin@nusantara.sch.id",
        "rate_per_student": 8000, "kiosk_token": "KIOSK-DEMO-1", "created_at": now_iso()})
    await db.settings.insert_one({"school_id": sid, "work_start": "07:00", "work_end": "15:00", "late_tolerance_min": 10})
    await db.locations.insert_one({
        "id": str(uuid.uuid4()), "school_id": sid, "name": "Gedung Utama",
        "lat": -6.2, "lng": 106.816666, "radius_m": 500})
    await db.users.insert_one({
        "id": str(uuid.uuid4()), "email": "admin@nusantara.sch.id", "name": "Admin Nusantara",
        "role": "school_admin", "password_hash": hash_password("Admin123!"),
        "school_id": sid, "created_at": now_iso()})
    tu = str(uuid.uuid4())
    await db.users.insert_one({
        "id": tu, "email": "guru@nusantara.sch.id", "name": "Budi Santoso",
        "role": "teacher", "password_hash": hash_password("Guru123!"),
        "school_id": sid, "created_at": now_iso()})
    await db.teachers.insert_one({
        "id": str(uuid.uuid4()), "school_id": sid, "user_id": tu, "name": "Budi Santoso",
        "nip": "198001012005011001", "subject": "Matematika", "embedding": None,
        "photo": None, "active": True, "created_at": now_iso()})
    await db.students.insert_many([
        {"id": str(uuid.uuid4()), "school_id": sid, "name": f"Siswa Demo {i}",
         "nis": f"10{i:03d}", "class": f"X-{(i % 6) + 1}"} for i in range(1, 121)])
    logger.info("Demo school seeded")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
