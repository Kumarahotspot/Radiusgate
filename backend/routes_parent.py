import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_roles
from db import db
from routes_kiosk import _record

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
