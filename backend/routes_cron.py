import asyncio
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request

from db import db
from emailer import invoice_email_html, send_email
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


async def _run_weekly_parent_summary(run_id: str):
    """Ringkasan absensi minggu berjalan (Senin-Minggu) per siswa ke ortu via WA.
    Tanpa Wablas aktif, tidak ada yang terkirim (dihitung not_sent)."""
    try:
        from notif import get_notif_settings
        wablas_on = (await get_notif_settings()).get("wa_provider") == "wablas"
        sent = not_sent = failed = 0
        for school in await db.schools.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000):
            sid = school["id"]
            st = await db.settings.find_one({"school_id": sid}, {"_id": 0, "timezone": 1}) or {}
            try:
                tz = ZoneInfo(st.get("timezone", "Asia/Jakarta"))
            except Exception:
                tz = ZoneInfo("Asia/Jakarta")
            today = datetime.now(timezone.utc).astimezone(tz).date()
            monday = today - __import__("datetime").timedelta(days=today.weekday())
            date_from, date_to = monday.isoformat(), today.isoformat()
            students = await db.students.find(
                {"school_id": sid, "status": {"$ne": "lulus"}, "parent_phone": {"$nin": [None, ""]}},
                {"_id": 0, "id": 1, "name": 1, "class": 1, "parent_phone": 1}).to_list(5000)
            if not students:
                continue
            rows = await db.attendance.find(
                {"school_id": sid, "person_type": "student", "type": "in",
                 "date": {"$gte": date_from, "$lte": date_to}},
                {"_id": 0, "student_id": 1, "att_status": 1, "late_minutes": 1}).to_list(20000)
            per = {}
            for r in rows:
                per.setdefault(r.get("student_id"), []).append(r)
            weekdays_elapsed = sum(1 for i in range((today - monday).days + 1)
                                   if (monday + __import__("datetime").timedelta(days=i)).weekday() < 5)
            for s in students:
                recs = per.get(s["id"], [])
                hadir = len([r for r in recs if r.get("att_status", "present") == "present"])
                telat = len([r for r in recs if r.get("att_status", "present") == "present" and r.get("late_minutes", 0) > 0])
                sakit = len([r for r in recs if r.get("att_status") == "sakit"])
                izin = len([r for r in recs if r.get("att_status") == "izin"])
                alpha = max(0, weekdays_elapsed - hadir - sakit - izin)
                msg = (f"EduGateID - {school['name']}\n"
                       f"Ringkasan absensi minggu ini ({date_from} s/d {date_to})\n"
                       f"Ananda *{s['name']}* ({s.get('class', '-')})\n"
                       f"Hadir: {hadir} hari" + (f" (telat {telat}x)" if telat else "") + "\n"
                       f"Sakit: {sakit} - Izin: {izin} - Tanpa keterangan: {alpha}")
                if not wablas_on:
                    not_sent += 1
                    continue
                try:
                    await send_whatsapp(s["parent_phone"], msg)
                    sent += 1
                except Exception as e:
                    failed += 1
                    logger.warning("Ringkasan mingguan ke ortu %s gagal: %s", s["name"], e)
        await _finish_run(run_id, {"sent": sent, "not_sent": not_sent, "send_failed": failed})
    except Exception as e:
        await _finish_run(run_id, error=str(e))


@router.post("/cron/weekly-parent-summary")
async def cron_weekly_parent_summary(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _authorize(request)
    run_id, dup = await _accept_run(request, "weekly-parent-summary")
    if dup:
        return {"ok": True, "duplicate": True}
    asyncio.create_task(_run_weekly_parent_summary(run_id))
    return {"ok": True}


async def _run_spp_reminders(run_id: str):
    """Pengingat tagihan SPP mendekati jatuh tempo (H-3 & H-1) ke ortu via WA + email.
    WA no-op tanpa Wablas; email terkirim bila ortu punya email."""
    try:
        from notif import get_notif_settings
        from datetime import date as _date
        wablas_on = (await get_notif_settings()).get("wa_provider") == "wablas"
        wa_sent = wa_not_sent = email_sent = failed = 0
        today = datetime.now(timezone.utc).date()
        bills = await db.bills.find(
            {"$expr": {"$lt": ["$paid_amount", "$amount"]},
             "due_date": {"$in": [(today + __import__("datetime").timedelta(days=d)).isoformat() for d in (1, 3)]}},
            {"_id": 0}).to_list(10000)
        for bill in bills:
            days_left = (_date.fromisoformat(bill["due_date"]) - today).days
            if days_left in bill.get("reminded_for", []):
                continue
            st = await db.students.find_one({"id": bill["student_id"]},
                                            {"_id": 0, "parent_phone": 1, "parent_email": 1, "parent_name": 1})
            if not st or (not st.get("parent_phone") and not st.get("parent_email")):
                continue
            sisa = f"Rp {(bill['amount'] - bill.get('paid_amount', 0)):,}".replace(",", ".")
            school = await db.schools.find_one({"id": bill["school_id"]}, {"_id": 0, "name": 1})
            sname = (school or {}).get("name", "")
            if st.get("parent_phone"):
                if not wablas_on:
                    wa_not_sent += 1
                else:
                    try:
                        await send_whatsapp(st["parent_phone"], (
                            f"PENGINGAT Tagihan Sekolah - {sname}\n"
                            f"Siswa: *{bill['student_name']}*\nTagihan: {bill['title']}\n"
                            f"Sisa: {sisa}\nJatuh tempo: {bill['due_date']} (H-{days_left})"))
                        wa_sent += 1
                    except Exception as e:
                        failed += 1
                        logger.warning("Pengingat SPP WA %s gagal: %s", bill["id"], e)
            if st.get("parent_email"):
                try:
                    html = (f"<h3>Pengingat Tagihan Sekolah - {sname}</h3>"
                            f"<p>Yth. {st.get('parent_name') or 'Orang Tua/Wali'},</p>"
                            f"<p>Tagihan berikut akan jatuh tempo <b>H-{days_left}</b> ({bill['due_date']}):</p>"
                            f"<table cellpadding='6'>"
                            f"<tr><td>Siswa</td><td><b>{bill['student_name']}</b></td></tr>"
                            f"<tr><td>Tagihan</td><td>{bill['title']}</td></tr>"
                            f"<tr><td>Sisa Tagihan</td><td><b>{sisa}</b></td></tr></table>"
                            f"<p>Silakan bayar via Portal Orang Tua atau ke bendahara sekolah.<br>EduGateID</p>")
                    await send_email(to=st["parent_email"],
                                     subject=f"Pengingat Tagihan {bill['title']} - {sname}", html=html)
                    email_sent += 1
                except Exception as e:
                    failed += 1
                    logger.warning("Pengingat SPP email %s gagal: %s", bill["id"], e)
            await db.bills.update_one({"id": bill["id"]}, {"$addToSet": {"reminded_for": days_left}})
        await _finish_run(run_id, {"wa_sent": wa_sent, "wa_not_sent": wa_not_sent,
                                   "email_sent": email_sent, "send_failed": failed})
    except Exception as e:
        await _finish_run(run_id, error=str(e))


@router.post("/cron/spp-reminders")
async def cron_spp_reminders(request: Request):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _authorize(request)
    run_id, dup = await _accept_run(request, "spp-reminders")
    if dup:
        return {"ok": True, "duplicate": True}
    asyncio.create_task(_run_spp_reminders(run_id))
    return {"ok": True}
