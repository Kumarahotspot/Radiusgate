import asyncio
import hmac
import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request

from db import db
from routes_owner import generate_for_period

router = APIRouter(tags=["cron"])


async def _run_monthly_invoices(run_id: str, period: str):
    try:
        res = await generate_for_period(period, send_email=True)
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {
            "status": "done", "created": res["created"], "sent": res["sent"],
            "finished_at": datetime.now(timezone.utc).isoformat()}})
    except Exception as e:
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {
            "status": "error", "error": str(e),
            "finished_at": datetime.now(timezone.utc).isoformat()}})


@router.post("/cron/monthly-invoices")
async def cron_monthly_invoices(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    if not secret or not hmac.compare_digest(token, secret):
        raise HTTPException(status_code=401, detail="unauthorized")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid body")
    run_id = (body or {}).get("run_id") or request.headers.get("X-Webhook-Id") or uuid.uuid4().hex
    period = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m")
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"ok": True, "duplicate": True, "period": period}
    await db.cron_runs.insert_one({"run_id": run_id, "job": "monthly-invoices", "period": period,
                                   "status": "accepted", "ts": datetime.now(timezone.utc).isoformat()})
    asyncio.create_task(_run_monthly_invoices(run_id, period))
    return {"ok": True, "period": period}
