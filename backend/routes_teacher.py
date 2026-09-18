import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import db
from auth import require_roles
from routes_kiosk import _record

router = APIRouter(tags=["teacher"])
teacher_dep = require_roles("teacher")


async def my_teacher(user: dict) -> dict:
    t = await db.teachers.find_one({"user_id": user["id"]}, {"_id": 0, "embedding": 0, "photo": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Profil guru tidak ditemukan")
    return t


@router.get("/teacher/students")
async def students_for_teacher(user: dict = Depends(teacher_dep)):
    return await db.students.find(
        {"school_id": user["school_id"]}, {"_id": 0, "id": 1, "name": 1, "nis": 1, "class": 1}
    ).to_list(5000)


class StudentStatusIn(BaseModel):
    student_id: str
    status: str  # sakit | izin
    date: str
    note: str = ""


@router.post("/teacher/student-status")
async def mark_student_status(body: StudentStatusIn, user: dict = Depends(teacher_dep)):
    if body.status not in ("sakit", "izin"):
        raise HTTPException(status_code=400, detail="Status tidak valid")
    t = await my_teacher(user)
    st = await db.students.find_one({"id": body.student_id, "school_id": user["school_id"]}, {"_id": 0})
    if not st:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    doc = await _record(
        {"id": user["school_id"]}, st["id"], st["name"], "in", f"{body.date}T07:00:00",
        0, 0, "", str(uuid.uuid4()), offline=False, manual=True,
        extra={"person_type": "student", "class": st.get("class", ""), "att_status": body.status,
               "note": body.note, "recorded_by": t["id"], "recorded_by_name": t["name"]})
    return {"ok": True, "student_name": st["name"], "att_status": body.status, "date": doc["date"]}


@router.get("/teacher/student-status")
async def list_student_status(user: dict = Depends(teacher_dep)):
    return await db.attendance.find(
        {"school_id": user["school_id"], "person_type": "student",
         "att_status": {"$in": ["sakit", "izin"]}},
        {"_id": 0, "photo": 0}).sort("ts_server", -1).to_list(100)


@router.get("/teacher/attendance")
async def my_attendance(user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    return await db.attendance.find(
        {"teacher_id": t["id"]}, {"_id": 0, "photo": 0}
    ).sort("ts_server", -1).to_list(500)


class LeaveIn(BaseModel):
    type: str  # izin | sakit | cuti
    date_from: str
    date_to: str
    reason: str


@router.get("/teacher/leaves")
async def my_leaves(user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    return await db.leaves.find({"teacher_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/teacher/leaves")
async def create_leave(body: LeaveIn, user: dict = Depends(teacher_dep)):
    if body.type not in ("izin", "sakit", "cuti"):
        raise HTTPException(status_code=400, detail="Tipe tidak valid")
    t = await my_teacher(user)
    doc = {
        "id": str(uuid.uuid4()), "school_id": user["school_id"], "teacher_id": t["id"],
        "teacher_name": t["name"], "type": body.type, "date_from": body.date_from,
        "date_to": body.date_to, "reason": body.reason, "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leaves.insert_one(doc)
    doc.pop("_id", None)
    return doc
