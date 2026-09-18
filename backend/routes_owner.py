import os
import uuid
from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from db import db
from auth import require_roles, hash_password
from emailer import send_email, invoice_email_html

router = APIRouter(tags=["owner"])
owner_dep = require_roles("owner")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class SchoolIn(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    rate_per_student: int = 8000


class SchoolPatch(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    rate_per_student: int | None = None


@router.get("/owner/overview")
async def overview(user: dict = Depends(owner_dep)):
    schools = await db.schools.count_documents({})
    teachers = await db.teachers.count_documents({})
    students = await db.students.count_documents({})
    unpaid = await db.invoices.find({"status": "unpaid"}, {"_id": 0, "amount": 1}).to_list(1000)
    return {
        "schools": schools,
        "teachers": teachers,
        "students": students,
        "unpaid_count": len(unpaid),
        "unpaid_amount": sum(i.get("amount", 0) for i in unpaid),
    }


@router.get("/owner/schools")
async def list_schools(user: dict = Depends(owner_dep)):
    schools = await db.schools.find({}, {"_id": 0}).to_list(1000)
    for s in schools:
        s["student_count"] = await db.students.count_documents({"school_id": s["id"]})
        s["teacher_count"] = await db.teachers.count_documents({"school_id": s["id"]})
    return schools


@router.post("/owner/schools")
async def create_school(body: SchoolIn, user: dict = Depends(owner_dep)):
    if await db.users.find_one({"email": body.admin_email.lower()}):
        raise HTTPException(status_code=400, detail="Email admin sudah dipakai")
    sid = str(uuid.uuid4())
    school = {
        "id": sid, "name": body.name, "address": body.address, "phone": body.phone,
        "admin_email": body.admin_email.lower(), "rate_per_student": body.rate_per_student,
        "kiosk_token": "KIOSK-" + uuid.uuid4().hex[:8].upper(), "created_at": now_iso(),
    }
    await db.schools.insert_one(school)
    await db.settings.insert_one({"school_id": sid, "work_start": "07:00", "work_end": "15:00", "late_tolerance_min": 10, "early_checkin_min": 60})
    await db.users.insert_one({
        "id": str(uuid.uuid4()), "email": body.admin_email.lower(), "name": body.admin_name,
        "role": "school_admin", "password_hash": hash_password(body.admin_password),
        "school_id": sid, "created_at": now_iso(),
    })
    school.pop("_id", None)
    return school


@router.patch("/owner/schools/{sid}")
async def update_school(sid: str, body: SchoolPatch, user: dict = Depends(owner_dep)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    await db.schools.update_one({"id": sid}, {"$set": upd})
    return await db.schools.find_one({"id": sid}, {"_id": 0})


@router.delete("/owner/schools/{sid}")
async def delete_school(sid: str, user: dict = Depends(owner_dep)):
    await db.schools.delete_one({"id": sid})
    for coll in ("users", "teachers", "students", "locations", "settings", "attendance", "leaves", "invoices"):
        await db[coll].delete_many({"school_id": sid})
    return {"ok": True}


class GenerateIn(BaseModel):
    period: str  # "2026-06"
    send_email: bool = False


@router.get("/owner/invoices")
async def list_invoices(period: str | None = None, user: dict = Depends(owner_dep)):
    q = {"period": period} if period else {}
    invs = await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    schools = {s["id"]: s for s in await db.schools.find({}, {"_id": 0}).to_list(1000)}
    for i in invs:
        i["school_name"] = schools.get(i["school_id"], {}).get("name", "?")
    return invs


@router.post("/owner/invoices/generate")
async def generate_invoices(body: GenerateIn, user: dict = Depends(owner_dep)):
    schools = await db.schools.find({}, {"_id": 0}).to_list(1000)
    created, sent = [], 0
    seq = await db.invoices.count_documents({"period": body.period})
    for s in schools:
        if await db.invoices.find_one({"school_id": s["id"], "period": body.period}):
            continue
        seq += 1
        count = await db.students.count_documents({"school_id": s["id"]})
        inv = {
            "id": str(uuid.uuid4()),
            "invoice_no": f"INV-{body.period}-{seq:03d}",
            "school_id": s["id"], "period": body.period,
            "student_count": count, "rate": s.get("rate_per_student", 8000),
            "amount": count * s.get("rate_per_student", 8000),
            "status": "unpaid", "public_token": uuid.uuid4().hex,
            "created_at": now_iso(), "sent_at": None, "paid_at": None,
        }
        await db.invoices.insert_one(inv)
        inv.pop("_id", None)
        created.append(inv)
        if body.send_email and s.get("admin_email"):
            await _send_invoice_email(inv, s)
            sent += 1
    return {"created": len(created), "sent": sent, "invoices": created}


async def _send_invoice_email(inv: dict, school: dict) -> str:
    pay_url = f"{FRONTEND_URL}/pay/{inv['public_token']}"
    pdf_url = f"{FRONTEND_URL}/api/public/invoice/{inv['public_token']}/pdf"
    subject = f"Invoice {inv['invoice_no']} - {school['name']} - Periode {inv['period']}"
    email_id = await send_email(to=school["admin_email"], subject=subject,
                                html=invoice_email_html(school["name"], inv, pay_url, pdf_url))
    await db.invoices.update_one({"id": inv["id"]}, {"$set": {"sent_at": now_iso()}})
    return email_id


@router.post("/owner/invoices/{iid}/send")
async def send_invoice(iid: str, user: dict = Depends(owner_dep)):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    school = await db.schools.find_one({"id": inv["school_id"]}, {"_id": 0})
    email_id = await _send_invoice_email(inv, school)
    pay_url = f"{FRONTEND_URL}/pay/{inv['public_token']}"
    pdf_url = f"{FRONTEND_URL}/api/public/invoice/{inv['public_token']}/pdf"
    amount = f"Rp {inv['amount']:,}".replace(",", ".")
    msg = (f"Tagihan Absensi Sekolah - {school['name']}\n"
           f"No: {inv['invoice_no']}\nPeriode: {inv['period']}\n"
           f"Total: {amount}\nBayar: {pay_url}\nPDF: {pdf_url}")
    wa_link = f"https://wa.me/{school.get('phone', '')}?text={quote(msg)}" if school.get("phone") else None
    return {"email_id": email_id, "wa_link": wa_link, "pay_url": pay_url}
