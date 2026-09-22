import asyncio
import calendar
import io
import logging
import re
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import require_roles
from db import db
from notif import send_whatsapp

router = APIRouter(tags=["spp"])
admin_dep = require_roles("school_admin")
logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = ["SPP", "Ujian", "Kegiatan", "Seragam", "Lainnya"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def bill_status(b: dict) -> str:
    if b.get("paid_amount", 0) >= b["amount"]:
        return "paid"
    if b.get("paid_amount", 0) > 0:
        return "partial"
    return "unpaid"


def with_status(b: dict) -> dict:
    b["status"] = bill_status(b)
    b["remaining"] = max(0, b["amount"] - b.get("paid_amount", 0))
    return b


async def _seed_categories(sid: str):
    if await db.bill_categories.count_documents({"school_id": sid}):
        return
    await db.bill_categories.insert_many([
        {"id": str(uuid.uuid4()), "school_id": sid, "name": n, "created_at": now_iso()}
        for n in DEFAULT_CATEGORIES])


async def _receipt_wa(sid: str, bill: dict, amount: int, reference: str):
    """Kuitansi WA ke orang tua setelah pembayaran tercatat. No-op jika Wablas belum aktif."""
    try:
        st = await db.students.find_one({"id": bill["student_id"]}, {"_id": 0, "parent_phone": 1, "name": 1})
        if not st or not st.get("parent_phone"):
            return
        school = await db.schools.find_one({"id": sid}, {"_id": 0, "name": 1})
        lunas = bill.get("paid_amount", 0) + amount >= bill["amount"]
        msg = (f"EduGateID - {(school or {}).get('name', '')}\n"
               f"Kuitansi Pembayaran\n"
               f"Siswa: *{bill['student_name']}*\nTagihan: {bill['title']}\n"
               f"Bayar: Rp {amount:,}\nRef: {reference}\n"
               f"Status: {'LUNAS' if lunas else 'Cicilan tercatat'}".replace(",", "."))
        await send_whatsapp(st["parent_phone"], msg)
    except Exception:
        logger.exception("kuitansi WA SPP gagal")


# ---------- Kategori ----------
@router.get("/admin/spp/categories")
async def list_categories(user: dict = Depends(admin_dep)):
    await _seed_categories(user["school_id"])
    return await db.bill_categories.find({"school_id": user["school_id"]}, {"_id": 0}).sort("name", 1).to_list(100)


class CategoryIn(BaseModel):
    name: str


@router.post("/admin/spp/categories")
async def create_category(body: CategoryIn, user: dict = Depends(admin_dep)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama kategori kosong")
    await _seed_categories(user["school_id"])
    if await db.bill_categories.find_one({"school_id": user["school_id"], "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Kategori sudah ada")
    doc = {"id": str(uuid.uuid4()), "school_id": user["school_id"], "name": name, "created_at": now_iso()}
    await db.bill_categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/admin/spp/categories/{cid}")
async def rename_category(cid: str, body: CategoryIn, user: dict = Depends(admin_dep)):
    name = body.name.strip()
    cat = await db.bill_categories.find_one({"id": cid, "school_id": user["school_id"]})
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    await db.bill_categories.update_one({"id": cid}, {"$set": {"name": name}})
    await db.bills.update_many({"school_id": user["school_id"], "category": cat["name"]}, {"$set": {"category": name}})
    return {"ok": True}


@router.delete("/admin/spp/categories/{cid}")
async def delete_category(cid: str, user: dict = Depends(admin_dep)):
    cat = await db.bill_categories.find_one({"id": cid, "school_id": user["school_id"]})
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    used = await db.bills.count_documents({"school_id": user["school_id"], "category": cat["name"]})
    if used:
        raise HTTPException(status_code=400, detail=f"category_in_use:{used}")
    await db.bill_categories.delete_one({"id": cid})
    return {"ok": True}


# ---------- Tagihan (Bills) ----------
class BillIn(BaseModel):
    student_id: str
    title: str
    category: str = "SPP"
    amount: int
    due_date: str


def _bill_doc(sid: str, st: dict, title: str, category: str, amount: int, due_date: str) -> dict:
    return {"id": str(uuid.uuid4()), "school_id": sid, "student_id": st["id"],
            "student_name": st["name"], "nis": st.get("nis", ""), "class": st.get("class", ""),
            "title": title.strip(), "category": category, "amount": int(amount),
            "paid_amount": 0, "due_date": due_date, "created_at": now_iso()}


@router.post("/admin/spp/bills")
async def create_bill(body: BillIn, user: dict = Depends(admin_dep)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Jumlah tidak valid")
    st = await db.students.find_one({"id": body.student_id, "school_id": user["school_id"]}, {"_id": 0})
    if not st:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    if await db.bills.find_one({"school_id": user["school_id"], "student_id": st["id"],
                                "title": body.title.strip(), "due_date": body.due_date}):
        raise HTTPException(status_code=409, detail="Tagihan yang sama sudah ada")
    doc = _bill_doc(user["school_id"], st, body.title, body.category, body.amount, body.due_date)
    await db.bills.insert_one(doc)
    doc.pop("_id", None)
    return with_status(doc)


class BulkBillIn(BaseModel):
    title: str
    category: str = "SPP"
    amount: int
    due_date: str
    class_name: str | None = None  # None/kosong = semua siswa aktif


@router.post("/admin/spp/bills/bulk")
async def bulk_bills(body: BulkBillIn, user: dict = Depends(admin_dep)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Jumlah tidak valid")
    sid = user["school_id"]
    q = {"school_id": sid, "status": {"$ne": "lulus"}}
    if body.class_name:
        q["class"] = body.class_name
    students = await db.students.find(q, {"_id": 0, "embedding": 0, "photo": 0}).to_list(5000)
    created, skipped = 0, 0
    docs = []
    for st in students:
        dup = await db.bills.find_one({"school_id": sid, "student_id": st["id"],
                                       "title": body.title.strip(), "due_date": body.due_date}, {"_id": 1})
        if dup:
            skipped += 1
            continue
        docs.append(_bill_doc(sid, st, body.title, body.category, body.amount, body.due_date))
        created += 1
    if docs:
        await db.bills.insert_many(docs)
    return {"created": created, "skipped": skipped}


@router.get("/admin/spp/bills")
async def list_bills(status: str | None = None, class_name: str | None = None,
                     month: str | None = None, q: str | None = None,
                     user: dict = Depends(admin_dep)):
    query = {"school_id": user["school_id"]}
    if class_name:
        query["class"] = class_name
    if month:
        query["due_date"] = {"$regex": f"^{month}"}
    bills = await db.bills.find(query, {"_id": 0}).sort("due_date", -1).to_list(5000)
    out = [with_status(b) for b in bills]
    if status in ("unpaid", "partial", "paid"):
        out = [b for b in out if b["status"] == status]
    if q:
        ql = q.lower()
        out = [b for b in out if ql in b["student_name"].lower() or ql in b.get("nis", "").lower() or ql in b["title"].lower()]
    return out


@router.get("/admin/spp/bills/{bid}/detail")
async def bill_detail(bid: str, user: dict = Depends(admin_dep)):
    bill = await db.bills.find_one({"id": bid, "school_id": user["school_id"]}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    payments = await db.spp_payments.find({"bill_id": bid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    st = await db.students.find_one({"id": bill["student_id"]}, {"_id": 0, "parent_phone": 1, "nisn": 1})
    bill["parent_phone"] = (st or {}).get("parent_phone", "")
    return {"bill": with_status(bill), "payments": payments}


@router.delete("/admin/spp/bills/{bid}")
async def delete_bill(bid: str, user: dict = Depends(admin_dep)):
    bill = await db.bills.find_one({"id": bid, "school_id": user["school_id"]})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    if bill.get("paid_amount", 0) > 0:
        raise HTTPException(status_code=400, detail="Tagihan sudah ada pembayaran")
    await db.bills.delete_one({"id": bid})
    return {"ok": True}


# ---------- Pembayaran ----------
class ManualPayIn(BaseModel):
    bill_id: str
    amount: int
    method: str = "Tunai"  # Tunai | Transfer Bank | Lainnya
    note: str = ""


async def _record_payment(sid: str, bill: dict, amount: int, method: str, channel: str,
                          reference: str, note: str, recorded_by: str) -> dict:
    pay = {"id": str(uuid.uuid4()), "school_id": sid, "bill_id": bill["id"],
           "student_id": bill["student_id"], "student_name": bill["student_name"],
           "bill_title": bill["title"], "class": bill.get("class", ""),
           "amount": amount, "method": method, "channel": channel, "reference": reference,
           "note": note, "recorded_by": recorded_by, "paid_at": now_iso(), "created_at": now_iso()}
    await db.spp_payments.insert_one(pay)
    pay.pop("_id", None)
    await db.bills.update_one({"id": bill["id"]}, {"$inc": {"paid_amount": amount}})
    asyncio.create_task(_receipt_wa(sid, bill, amount, reference))
    return pay


@router.post("/admin/spp/payments")
async def manual_payment(body: ManualPayIn, user: dict = Depends(admin_dep)):
    bill = await db.bills.find_one({"id": body.bill_id, "school_id": user["school_id"]})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    remaining = bill["amount"] - bill.get("paid_amount", 0)
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Jumlah tidak valid")
    if body.amount > remaining:
        raise HTTPException(status_code=422, detail=f"overpayment:{remaining}")
    ref = f"MAN-{uuid.uuid4().hex[:8].upper()}"
    return await _record_payment(user["school_id"], bill, body.amount, body.method, "manual", ref,
                                 body.note, user.get("name", ""))


@router.get("/admin/spp/payments")
async def list_payments(month: str | None = None, class_name: str | None = None,
                        user: dict = Depends(admin_dep)):
    q = {"school_id": user["school_id"]}
    if month:
        q["paid_at"] = {"$regex": f"^{month}"}
    if class_name:
        q["class"] = class_name
    return await db.spp_payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)


@router.get("/admin/spp/stats")
async def spp_stats(user: dict = Depends(admin_dep)):
    sid = user["school_id"]
    today = now_iso()[:10]
    month = today[:7]
    bills = await db.bills.find({"school_id": sid}, {"_id": 0, "amount": 1, "paid_amount": 1, "due_date": 1}).to_list(10000)
    pays = await db.spp_payments.find({"school_id": sid, "paid_at": {"$regex": f"^{month}"}},
                                      {"_id": 0, "amount": 1}).to_list(10000)
    outstanding = sum(max(0, b["amount"] - b.get("paid_amount", 0)) for b in bills)
    overdue = len([b for b in bills if b.get("paid_amount", 0) < b["amount"] and b.get("due_date", "9999") < today])
    return {
        "total_billed": sum(b["amount"] for b in bills),
        "total_collected": sum(b.get("paid_amount", 0) for b in bills),
        "outstanding": outstanding,
        "overdue_count": overdue,
        "collected_this_month": sum(p["amount"] for p in pays),
        "payments_this_month": len(pays),
        "students_billed": len({b.get("student_id") for b in await db.bills.find({"school_id": sid}, {"student_id": 1}).to_list(10000)}),
    }


@router.get("/admin/spp/export")
async def export_payments(month: str | None = None, user: dict = Depends(admin_dep)):
    pays = await list_payments(month, None, user)
    df = pd.DataFrame([{
        "Tanggal": p["paid_at"][:10], "Siswa": p["student_name"], "Kelas": p.get("class", ""),
        "Tagihan": p["bill_title"], "Metode": p["method"], "Channel": p["channel"],
        "Referensi": p["reference"], "Jumlah (Rp)": p["amount"],
    } for p in pays])
    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=transaksi-spp-{month or 'semua'}.xlsx"})
