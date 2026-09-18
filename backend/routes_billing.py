import os
import hmac
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from db import db
from auth import require_roles
from pdfgen import build_invoice_pdf, invoice_pdf_path

router = APIRouter(tags=["billing"])
admin_dep = require_roles("school_admin")
TRIPAY_MODE = os.environ.get("TRIPAY_MODE", "mock")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


@router.get("/admin/invoices")
async def my_invoices(user: dict = Depends(admin_dep)):
    return await db.invoices.find({"school_id": user["school_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


async def _public_invoice(token: str):
    inv = await db.invoices.find_one({"public_token": token}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    return inv


@router.get("/public/invoice/{token}")
async def public_invoice(token: str):
    inv = await _public_invoice(token)
    school = await db.schools.find_one({"id": inv["school_id"]}, {"_id": 0, "name": 1, "address": 1})
    return {"invoice": inv, "school": school, "tripay_mode": TRIPAY_MODE}


@router.get("/public/invoice/{token}/pdf")
async def public_invoice_pdf(token: str):
    inv = await _public_invoice(token)
    school = await db.schools.find_one({"id": inv["school_id"]}, {"_id": 0})
    path = invoice_pdf_path(inv["id"])
    if not os.path.exists(path):
        path = build_invoice_pdf(inv, school)
    return FileResponse(path, media_type="application/pdf", filename=f"{inv['invoice_no']}.pdf")


@router.post("/public/invoice/{token}/pay")
async def create_payment(token: str):
    inv = await _public_invoice(token)
    if inv["status"] == "paid":
        raise HTTPException(status_code=400, detail="Invoice sudah lunas")
    if TRIPAY_MODE == "real":
        raise HTTPException(status_code=501, detail="Tripay belum dikonfigurasi. Isi TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, TRIPAY_MERCHANT_CODE di backend/.env")
    return {"mode": "mock", "payment_url": f"{FRONTEND_URL}/pay/{token}", "reference": f"MOCK-{inv['invoice_no']}"}


@router.post("/public/invoice/{token}/mock-pay")
async def mock_pay(token: str):
    if TRIPAY_MODE != "mock":
        raise HTTPException(status_code=400, detail="Bukan mode mock")
    inv = await _public_invoice(token)
    await db.invoices.update_one({"id": inv["id"]}, {"$set": {
        "status": "paid", "paid_at": datetime.now(timezone.utc).isoformat(),
        "payment_method": "mock-tripay", "payment_ref": f"MOCK-{inv['invoice_no']}"}})
    return {"ok": True, "status": "paid"}


@router.post("/webhooks/tripay")
async def tripay_webhook(request: Request):
    raw = await request.body()
    private_key = os.environ.get("TRIPAY_PRIVATE_KEY", "")
    if private_key:
        sig = request.headers.get("X-Callback-Signature", "")
        expected = hmac.new(private_key.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise HTTPException(status_code=403, detail="Invalid signature")
    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")
    if data.get("status") == "PAID" and data.get("merchant_ref"):
        await db.invoices.update_one(
            {"id": data["merchant_ref"]},
            {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat(),
                      "payment_method": data.get("payment_method", "tripay"),
                      "payment_ref": data.get("reference", "")}})
    return {"success": True}
