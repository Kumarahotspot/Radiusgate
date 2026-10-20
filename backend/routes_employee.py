import re
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_roles
from db import db

router = APIRouter(tags=["employee"])
employee_dep = require_roles("employee")


async def my_employee(user: dict) -> dict:
    e = await db.employees.find_one({"user_id": user["id"]}, {"_id": 0, "embedding": 0, "photo": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Profil karyawan tidak ditemukan")
    return e


@router.get("/employee/me")
async def me(user: dict = Depends(employee_dep)):
    e = await my_employee(user)
    st = await db.settings.find_one(
        {"school_id": user["school_id"]}, {"_id": 0, "overtime_rate": 1, "work_start": 1, "work_end": 1}) or {}
    e["effective_overtime_rate"] = e.get("overtime_rate") if e.get("overtime_rate") is not None else (st.get("overtime_rate") or 0)
    e["work_start"] = st.get("work_start", "07:00")
    e["work_end"] = st.get("work_end", "15:00")
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "org_type": 1}) or {}
    e["org_type"] = school.get("org_type", "school")
    return e


@router.get("/employee/attendance")
async def my_attendance(user: dict = Depends(employee_dep)):
    e = await my_employee(user)
    return await db.attendance.find({"employee_id": e["id"]}, {"_id": 0, "photo": 0}).sort("ts_server", -1).to_list(500)


class OvertimeIn(BaseModel):
    date: str
    minutes: int
    reason: str = ""


@router.get("/employee/overtime")
async def my_overtime(user: dict = Depends(employee_dep)):
    e = await my_employee(user)
    return await db.overtime_requests.find({"employee_id": e["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/employee/overtime")
async def create_overtime(body: OvertimeIn, user: dict = Depends(employee_dep)):
    if body.minutes < 15 or body.minutes > 720:
        raise HTTPException(status_code=400, detail="Durasi lembur tidak valid (15-720 menit)")
    e = await my_employee(user)
    doc = {
        "id": str(uuid.uuid4()), "school_id": user["school_id"], "employee_id": e["id"],
        "employee_name": e["name"], "date": body.date, "minutes": body.minutes,
        "reason": body.reason, "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.overtime_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/employee/pppk/summary")
async def pppk_my_summary(month: str | None = None, user: dict = Depends(employee_dep)):
    from routes_admin import _pppk_collect, _pppk_minutes, school_today  # lokal: hindari circular import
    e = await my_employee(user)
    sid = user["school_id"]
    today = await school_today(sid)
    m = month or today[:7]
    if not re.match(r"^\d{4}-\d{2}$", m):
        raise HTTPException(status_code=422, detail="Format bulan tidak valid")
    att = await db.attendance.find(
        {"school_id": sid, "person_type": "employee", "employee_id": e["id"], "date": {"$regex": f"^{m}"}},
        {"_id": 0, "employee_id": 1, "date": 1, "type": 1, "time_local": 1}).to_list(5000)
    per = _pppk_collect(att)
    d0 = datetime.strptime(today, "%Y-%m-%d").date()
    w_start = (d0 - timedelta(days=d0.weekday())).isoformat()
    w_end = (d0 + timedelta(days=6 - d0.weekday())).isoformat()
    days = mins = week_mins = 0
    for (_eid, d), v in per.items():
        mm = _pppk_minutes(v)
        days += 1
        mins += mm
        if w_start <= d <= w_end:
            week_mins += mm
    settings = await db.settings.find_one({"school_id": sid}, {"_id": 0, "max_hours_week": 1}) or {}
    rate = e.get("hourly_rate") or 0
    return {
        "month": m, "days": days,
        "hours": round(mins / 60, 2), "week_hours": round(week_mins / 60, 2),
        "hourly_rate": rate,
        "total_pay": int(mins / 60 * rate), "week_pay": int(week_mins / 60 * rate),
        "max_hours_week": int(settings.get("max_hours_week", 35)),
    }
