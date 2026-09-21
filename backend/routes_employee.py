import uuid
from datetime import datetime, timezone

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
