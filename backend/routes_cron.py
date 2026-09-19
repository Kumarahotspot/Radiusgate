import asyncio
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request

from db import db
from emailer import invoice_email_html
from notif import send_email_unified, send_whatsapp
from routes_owner import generate_for_period

router = APIRouter(tags=["cron"])

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
REMINDER_AFTER_DAYS = 10   # pengingat pertama saat invoice berumur H+10
REMINDER_REPEAT_DAYS = 7   # pengingat ulang tiap 7 hari selama belum lunas


def _authorize(request: Request):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    if not secret or not hmac.compare_digest(token, secret):
        raise HTTPException(status_code=401, detail="unauthorized")


async def _accept_run(request: Request, job: str) -> tuple[str, bool]:
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid body")
    run_id = (body or {}).get("run_id") or request.headers.get("X-Webhook-Id") or uuid.uuid4().hex
    if await db.cron_runs.find_one({"run_id": run_id}):
        return run_id, True
    await db.cron_runs.insert_one({"run_id": run_id, "job": job, "status": "accepted",
                                   "ts": datetime.now(timezone.utc).isoformat()})
    return run_id, False


async def _finish_run(run_id: str, result: dict | None = None, error: str | None = None):
    upd = {"status": "error" if error else "done",
           "finished_at": datetime.now(timezone.utc).isoformat()}
    if error:
        upd["error"] = error
    if result:
        upd.update(result)
    await db.cron_runs.update_one({"run_id": run_id}, {"$set": upd})


async def _run_monthly_invoices(run_id: str, period: str):
    try:
        res = await generate_for_period(period, send_email=True)
        await _finish_run(run_id, {"period": period, "created": res["created"], "sent": res["sent"]})
    except Exception as e:
        await _finish_run(run_id, error=str(e))


@router.post("/cron/monthly-invoices")
async def cron_monthly_invoices(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _authorize(request)
    run_id, dup = await _accept_run(request, "monthly-invoices")
    period = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m")
    if dup:
        return {"ok": True, "duplicate": True, "period": period}
    await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"period": period}})
    asyncio.create_task(_run_monthly_invoices(run_id, period))
    return {"ok": True, "period": period}


async def _run_invoice_reminders(run_id: str):
    try:
        now = datetime.now(timezone.utc)
        sent, failed = 0, 0
        for inv in await db.invoices.find({"status": "unpaid"}, {"_id": 0}).to_list(1000):
            try:
                created = datetime.fromisoformat(inv["created_at"])
            except Exception:
                continue
            if (now - created).days < REMINDER_AFTER_DAYS:
                continue
            last = inv.get("last_reminder_at")
            if last:
                try:
                    if (now - datetime.fromisoformat(last)).days < REMINDER_REPEAT_DAYS:
                        continue
                    if inv.get("reminder_count", 0) >= 3:
                        continue
                except Exception:
                    pass
            school = await db.schools.find_one({"id": inv["school_id"]}, {"_id": 0})
            if not school:
                continue
            pay_url = f"{FRONTEND_URL}/pay/{inv['public_token']}"
            pdf_url = f"{FRONTEND_URL}/api/public/invoice/{inv['public_token']}/pdf"
            try:
                if school.get("admin_email"):
                    await send_email_unified(
                        to=school["admin_email"],
                        subject=f"PENGINGAT: Invoice {inv['invoice_no']} - {school['name']} - Periode {inv['period']}",
                        html=invoice_email_html(school["name"], inv, pay_url, pdf_url))
                if school.get("phone"):
                    amount = f"Rp {inv['amount']:,}".replace(",", ".")
                    await send_whatsapp(
                        school["phone"],
                        f"PENGINGAT Tagihan EduGateID - {school['name']}\n"
                        f"No: {inv['invoice_no']}\nPeriode: {inv['period']}\nTotal: {amount}\nBayar: {pay_url}",
                        pdf_url)
            except Exception as e:
                failed += 1
                logger.warning("Pengingat %s ke %s gagal: %s", inv["invoice_no"], school.get("name"), e)
            await db.invoices.update_one({"id": inv["id"]},
                                         {"$set": {"last_reminder_at": now.isoformat()},
                                          "$inc": {"reminder_count": 1}})
            sent += 1
        await _finish_run(run_id, {"reminded": sent, "send_failed": failed})
    except Exception as e:
        await _finish_run(run_id, error=str(e))


@router.post("/cron/invoice-reminders")
async def cron_invoice_reminders(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _authorize(request)
    run_id, dup = await _accept_run(request, "invoice-reminders")
    if dup:
        return {"ok": True, "duplicate": True}
    asyncio.create_task(_run_invoice_reminders(run_id))
    return {"ok": True}
