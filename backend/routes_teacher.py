import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import db
from auth import require_roles

router = APIRouter(tags=["teacher"])
teacher_dep = require_roles("teacher")


async def my_teacher(user: dict) -> dict:
    t = await db.teachers.find_one({"user_id": user["id"]}, {"_id": 0, "embedding": 0, "photo": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Profil guru tidak ditemukan")
    return t


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
