import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from auth import require_roles
from db import db
from pdfgen import build_spp_receipt_pdf
from routes_kiosk import _record
from routes_spp import _receipt_notify

router = APIRouter(tags=["parent"])
parent_dep = require_roles("parent")


async def my_child(user: dict) -> dict:
    st = await db.students.find_one(
        {"id": user.get("student_id"), "school_id": user["school_id"]}, {"_id": 0, "embedding": 0})
    if not st:
        raise HTTPException(status_code=404, detail="Data anak tidak ditemukan")
    return st


@router.get("/parent/me")
async def me(user: dict = Depends(parent_dep)):
    st = await my_child(user)
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "name": 1})
    return {
        "parent": {"name": user.get("name", ""), "phone": user.get("phone", "")},
        "school_name": (school or {}).get("name", ""),
        "child": {"id": st["id"], "name": st["name"], "nis": st.get("nis", ""),
                  "nisn": st.get("nisn", ""), "class": st.get("class", ""),
                  "gender": st.get("gender", ""), "photo": st.get("photo")},
    }


@router.get("/parent/attendance")
async def child_attendance(user: dict = Depends(parent_dep)):
    st = await my_child(user)
    return await db.attendance.find({"student_id": st["id"]}, {"_id": 0, "photo": 0}).sort("ts_server", -1).to_list(200)


class ParentLeaveIn(BaseModel):
    status: str  # sakit | izin
    date: str
    note: str = ""


@router.post("/parent/leave")
async def child_leave(body: ParentLeaveIn, user: dict = Depends(parent_dep)):
    if body.status not in ("sakit", "izin"):
        raise HTTPException(status_code=400, detail="Status tidak valid")
    st = await my_child(user)
    doc = await _record(
        {"id": user["school_id"]}, st["id"], st["name"], "in", f"{body.date}T07:00:00",
        0, 0, "", str(uuid.uuid4()), offline=False, manual=True,
        extra={"person_type": "student", "class": st.get("class", ""), "att_status": body.status,
               "note": body.note, "recorded_by": user["id"], "recorded_by_name": "Orang Tua"})
    return {"ok": True, "date": doc["date"], "att_status": body.status}


# ---------- Tagihan SPP anak ----------
@router.get("/parent/spp")
async def child_spp(user: dict = Depends(parent_dep)):
    st = await my_child(user)
    bills = await db.bills.find({"school_id": user["school_id"], "student_id": st["id"]},
                                {"_id": 0}).sort("due_date", -1).to_list(200)
    for b in bills:
        b["status"] = "paid" if b.get("paid_amount", 0) >= b["amount"] else ("partial" if b.get("paid_amount", 0) > 0 else "unpaid")
        b["remaining"] = max(0, b["amount"] - b.get("paid_amount", 0))
    payments = await db.spp_payments.find({"school_id": user["school_id"], "student_id": st["id"]},
                                          {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"bills": bills, "payments": payments}


class SppPayIn(BaseModel):
    bill_id: str
    amount: int


@router.post("/parent/spp/pay")
async def pay_bill(body: SppPayIn, user: dict = Depends(parent_dep)):
    """MODE DEMO: pembayaran online disimulasikan (langsung tercatat). Beralih ke Tripay asli
    otomatis saat kredensial diisi."""
    st = await my_child(user)
    bill = await db.bills.find_one({"id": body.bill_id, "school_id": user["school_id"], "student_id": st["id"]})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    remaining = bill["amount"] - bill.get("paid_amount", 0)
    if body.amount <= 0 or body.amount > remaining:
        raise HTTPException(status_code=422, detail=f"overpayment:{remaining}")
    ref = f"DEMO-{uuid.uuid4().hex[:8].upper()}"
    pay = {"id": str(uuid.uuid4()), "school_id": user["school_id"], "bill_id": bill["id"],
           "student_id": st["id"], "student_name": st["name"], "bill_title": bill["title"],
           "class": st.get("class", ""), "amount": body.amount, "method": "Online (Demo)",
           "channel": "tripay_demo", "reference": ref, "note": "", "recorded_by": "Orang Tua",
           "paid_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
           "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}
    await db.spp_payments.insert_one(pay)
    pay.pop("_id", None)
    await db.bills.update_one({"id": bill["id"]}, {"$inc": {"paid_amount": body.amount}})
    asyncio.create_task(_receipt_notify(user["school_id"], bill, body.amount, ref))
    return {"ok": True, "reference": ref, "mode": "demo"}

    return {"ok": True, "reference": ref, "mode": "demo"}


@router.get("/parent/spp/payments/{pid}/receipt.pdf")
async def child_payment_receipt(pid: str, user: dict = Depends(parent_dep)):
    st = await my_child(user)
    pay = await db.spp_payments.find_one(
        {"id": pid, "school_id": user["school_id"], "student_id": st["id"]}, {"_id": 0})
    if not pay:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    bill = await db.bills.find_one({"id": pay["bill_id"]}, {"_id": 0})
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "name": 1})
    if bill:
        bill["status"] = "paid" if bill.get("paid_amount", 0) >= bill["amount"] else (
            "partial" if bill.get("paid_amount", 0) > 0 else "unpaid")
        bill["remaining"] = max(0, bill["amount"] - bill.get("paid_amount", 0))
    path = build_spp_receipt_pdf(f"/tmp/kuitansi_parent_{pid}.pdf", (school or {}).get("name", ""),
                                 bill or {}, pay)
    return FileResponse(path, media_type="application/pdf",
                        filename=f"kuitansi-{pay.get('reference', pid)}.pdf")
