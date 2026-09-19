import io
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, EmailStr
from typing import List
from db import db
from auth import require_roles, hash_password
from faceutil import embed, cos_sim, NoFaceError, MATCH_SIM_THRESHOLD
from starlette.concurrency import run_in_threadpool
from pdfgen import build_report_pdf

router = APIRouter(tags=["admin"])
admin_dep = require_roles("school_admin")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def school_today(sid: str) -> str:
    st = await db.settings.find_one({"school_id": sid}, {"_id": 0, "timezone": 1})
    try:
        tz = ZoneInfo((st or {}).get("timezone", "Asia/Jakarta"))
    except Exception:
        tz = ZoneInfo("Asia/Jakarta")
    return datetime.now(timezone.utc).astimezone(tz).date().isoformat()


# ---------- Dashboard ----------
@router.get("/admin/stats")
async def stats(user: dict = Depends(admin_dep)):
    sid = user["school_id"]
    today = await school_today(sid)
    today_att = await db.attendance.find({"school_id": sid, "date": today, "type": "in"}, {"_id": 0}).to_list(5000)
    return {
        "present_today": len({a["teacher_id"] for a in today_att if a.get("person_type", "teacher") == "teacher"}),
        "students_present": len({a.get("student_id") for a in today_att
                                 if a.get("person_type") == "student" and a.get("att_status", "present") == "present"}),
        "late_today": len([a for a in today_att if a.get("status") == "late"]),
        "pending_leaves": await db.leaves.count_documents({"school_id": sid, "status": "pending"}),
        "total_teachers": await db.teachers.count_documents({"school_id": sid, "active": True}),
        "total_students": await db.students.count_documents({"school_id": sid}),
    }


@router.get("/admin/today")
async def today_list(user: dict = Depends(admin_dep)):
    return await db.attendance.find(
        {"school_id": user["school_id"], "date": await school_today(user["school_id"])}, {"_id": 0, "photo": 0}
    ).sort("ts_server", -1).to_list(500)


@router.delete("/admin/attendance/{aid}")
async def delete_attendance(aid: str, user: dict = Depends(admin_dep)):
    res = await db.attendance.delete_one({"id": aid, "school_id": user["school_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data absensi tidak ditemukan")
    return {"ok": True}


# ---------- Teachers ----------
class TeacherIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    nip: str = ""
    subject: str = ""


class TeacherPatch(BaseModel):
    name: str | None = None
    nip: str | None = None
    subject: str | None = None
    active: bool | None = None


@router.get("/admin/teachers")
async def list_teachers(user: dict = Depends(admin_dep)):
    teachers = await db.teachers.find({"school_id": user["school_id"]}, {"_id": 0, "embedding": 0, "photo": 0}).to_list(1000)
    for t in teachers:
        u = await db.users.find_one({"id": t["user_id"]}, {"_id": 0, "email": 1})
        t["email"] = u["email"] if u else ""
        enrolled = await db.teachers.find_one({"id": t["id"]}, {"embedding": 1})
        t["enrolled"] = bool(enrolled and enrolled.get("embedding"))
    return teachers


@router.post("/admin/teachers")
async def create_teacher(body: TeacherIn, user: dict = Depends(admin_dep)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email sudah dipakai")
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid, "email": body.email.lower(), "name": body.name, "role": "teacher",
        "password_hash": hash_password(body.password), "school_id": user["school_id"], "created_at": now_iso(),
    })
    teacher = {
        "id": str(uuid.uuid4()), "school_id": user["school_id"], "user_id": uid,
        "name": body.name, "nip": body.nip, "subject": body.subject,
        "embedding": None, "photo": None, "active": True, "created_at": now_iso(),
    }
    await db.teachers.insert_one(teacher)
    teacher.pop("_id", None)
    teacher.pop("embedding", None)
    teacher.pop("photo", None)
    teacher["email"] = body.email.lower()
    teacher["enrolled"] = False
    return teacher


@router.patch("/admin/teachers/{tid}")
async def update_teacher(tid: str, body: TeacherPatch, user: dict = Depends(admin_dep)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    await db.teachers.update_one({"id": tid, "school_id": user["school_id"]}, {"$set": upd})
    if "name" in upd:
        t = await db.teachers.find_one({"id": tid}, {"_id": 0, "user_id": 1})
        if t:
            await db.users.update_one({"id": t["user_id"]}, {"$set": {"name": upd["name"]}})
    return {"ok": True}


@router.delete("/admin/teachers/{tid}")
async def delete_teacher(tid: str, user: dict = Depends(admin_dep)):
    t = await db.teachers.find_one({"id": tid, "school_id": user["school_id"]})
    if not t:
        raise HTTPException(status_code=404, detail="Guru tidak ditemukan")
    await db.teachers.delete_one({"id": tid})
    await db.users.delete_one({"id": t["user_id"]})
    return {"ok": True}


class EnrollIn(BaseModel):
    photo: str


async def _face_dup_check(school_id: str, emb, exclude_id: str):
    """Tolak enroll jika wajah sudah terdaftar atas nama orang lain (guru/siswa) di sekolah."""
    others = await db.teachers.find(
        {"school_id": school_id, "id": {"$ne": exclude_id}, "embedding": {"$type": "array"}},
        {"_id": 0, "name": 1, "embedding": 1}).to_list(2000)
    others += await db.students.find(
        {"school_id": school_id, "id": {"$ne": exclude_id}, "embedding": {"$type": "array"}},
        {"_id": 0, "name": 1, "embedding": 1}).to_list(5000)
    for o in others:
        if cos_sim(emb, o["embedding"]) >= MATCH_SIM_THRESHOLD:
            raise HTTPException(status_code=409, detail=f"face_already_enrolled:{o['name']}")


@router.post("/admin/teachers/{tid}/enroll")
async def enroll_face(tid: str, body: EnrollIn, user: dict = Depends(admin_dep)):
    t = await db.teachers.find_one({"id": tid, "school_id": user["school_id"]})
    if not t:
        raise HTTPException(status_code=404, detail="Guru tidak ditemukan")
    try:
        emb = await run_in_threadpool(embed, body.photo)
    except NoFaceError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="Foto tidak valid")
    await _face_dup_check(user["school_id"], emb, tid)
    await db.teachers.update_one({"id": tid}, {"$set": {"embedding": emb, "embedding_model": "buffalo_s", "photo": body.photo, "enrolled_at": now_iso()}})
    return {"ok": True, "enrolled": True}


# ---------- Settings & Locations ----------
class SettingsIn(BaseModel):
    work_start: str | None = None
    work_end: str | None = None
    late_tolerance_min: int | None = None
    early_checkin_min: int | None = None
    timezone: str | None = None
    require_checkin: bool | None = None


@router.get("/admin/settings")
async def get_settings(user: dict = Depends(admin_dep)):
    st = await db.settings.find_one({"school_id": user["school_id"]}, {"_id": 0})
    locs = await db.locations.find({"school_id": user["school_id"]}, {"_id": 0}).to_list(100)
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "kiosk_token": 1, "name": 1})
    return {"settings": st, "locations": locs, "school": school}


@router.put("/admin/settings")
async def put_settings(body: SettingsIn, user: dict = Depends(admin_dep)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    await db.settings.update_one({"school_id": user["school_id"]}, {"$set": upd}, upsert=True)
    return {"ok": True}


class LocationIn(BaseModel):
    name: str
    lat: float
    lng: float
    radius_m: int = 50


@router.post("/admin/locations")
async def add_location(body: LocationIn, user: dict = Depends(admin_dep)):
    loc = {"id": str(uuid.uuid4()), "school_id": user["school_id"], **body.model_dump()}
    await db.locations.insert_one(loc)
    loc.pop("_id", None)
    return loc


@router.patch("/admin/locations/{lid}")
async def update_location(lid: str, body: LocationIn, user: dict = Depends(admin_dep)):
    await db.locations.update_one({"id": lid, "school_id": user["school_id"]}, {"$set": body.model_dump()})
    return {"ok": True}


@router.delete("/admin/locations/{lid}")
async def delete_location(lid: str, user: dict = Depends(admin_dep)):
    await db.locations.delete_one({"id": lid, "school_id": user["school_id"]})
    return {"ok": True}


# ---------- Students ----------
class StudentIn(BaseModel):
    name: str
    nis: str = ""
    nisn: str = ""
    gender: str = ""
    class_name: str = ""


def _norm_gender(v: str) -> str:
    v = (v or "").strip().lower()
    if v in ("l", "lk", "laki", "laki-laki", "male", "m"):
        return "L"
    if v in ("p", "pr", "perempuan", "female", "f", "w", "wanita"):
        return "P"
    return ""


@router.get("/admin/students")
async def list_students(user: dict = Depends(admin_dep)):
    students = await db.students.find({"school_id": user["school_id"]}, {"_id": 0, "embedding": 0, "photo": 0}).to_list(5000)
    enrolled_ids = {s["id"] for s in await db.students.find(
        {"school_id": user["school_id"], "embedding": {"$ne": None}}, {"_id": 0, "id": 1}).to_list(5000)}
    for s in students:
        s["enrolled"] = s["id"] in enrolled_ids
    return students


@router.post("/admin/students")
async def add_student(body: StudentIn, user: dict = Depends(admin_dep)):
    st = {"id": str(uuid.uuid4()), "school_id": user["school_id"],
          "name": body.name, "nis": body.nis, "nisn": body.nisn,
          "gender": _norm_gender(body.gender), "class": body.class_name}
    await db.students.insert_one(st)
    st.pop("_id", None)
    return st


@router.post("/admin/students/{stid}/enroll")
async def enroll_student_face(stid: str, body: EnrollIn, user: dict = Depends(admin_dep)):
    st = await db.students.find_one({"id": stid, "school_id": user["school_id"]})
    if not st:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    try:
        emb = await run_in_threadpool(embed, body.photo)
    except NoFaceError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="Foto tidak valid")
    await _face_dup_check(user["school_id"], emb, stid)
    await db.students.update_one({"id": stid}, {"$set": {"embedding": emb, "embedding_model": "buffalo_s", "photo": body.photo, "enrolled_at": now_iso()}})
    return {"ok": True, "enrolled": True}


class StudentPatch(BaseModel):
    name: str | None = None
    nis: str | None = None
    nisn: str | None = None
    gender: str | None = None
    class_name: str | None = None


@router.patch("/admin/students/{stid}")
async def update_student(stid: str, body: StudentPatch, user: dict = Depends(admin_dep)):
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if "class_name" in upd:
        upd["class"] = upd.pop("class_name")
    if not upd:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    res = await db.students.update_one({"id": stid, "school_id": user["school_id"]}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    return {"ok": True}


@router.delete("/admin/students/{stid}")
async def delete_student(stid: str, user: dict = Depends(admin_dep)):
    await db.students.delete_one({"id": stid, "school_id": user["school_id"]})
    return {"ok": True}


@router.post("/admin/students/import/preview")
async def import_preview(file: UploadFile = File(...), user: dict = Depends(admin_dep)):
    content = await file.read()
    try:
        if file.filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), dtype=str)
        else:
            df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception:
        raise HTTPException(status_code=400, detail="File tidak bisa dibaca. Gunakan CSV atau XLSX.")
    df.columns = [str(c).strip().lower() for c in df.columns]
    colmap = {}
    for c in df.columns:
        if c in ("name", "nama"):
            colmap["name"] = c
        elif c == "nis":
            colmap["nis"] = c
        elif c == "nisn":
            colmap["nisn"] = c
        elif c in ("class", "kelas"):
            colmap["class"] = c
        elif c in ("gender", "jk", "kelamin", "jenis_kelamin", "jenis kelamin", "l/p"):
            colmap["gender"] = c
    if "name" not in colmap:
        raise HTTPException(status_code=400, detail="Kolom 'name'/'nama' wajib ada")
    valid, errors = [], []
    for i, row in df.iterrows():
        def val(key):
            col = colmap.get(key)
            if not col:
                return ""
            v = str(row[col]).strip()
            return "" if v.lower() in ("nan", "none") else v
        nm = val("name")
        if not nm:
            errors.append({"row": int(i) + 2, "message": "Nama kosong"})
            continue
        valid.append({"name": nm, "nis": val("nis"), "nisn": val("nisn"),
                      "gender": _norm_gender(val("gender")), "class": val("class")})
    return {"valid": valid, "errors": errors, "total": len(df)}


class CommitIn(BaseModel):
    rows: List[dict]


@router.post("/admin/students/import/commit")
async def import_commit(body: CommitIn, user: dict = Depends(admin_dep)):
    sid = user["school_id"]
    existing = {s.get("nis") for s in await db.students.find({"school_id": sid}, {"nis": 1}).to_list(10000) if s.get("nis")}
    docs = []
    for r in body.rows:
        nis = str(r.get("nis", "")).strip()
        if nis and nis in existing:
            continue
        docs.append({"id": str(uuid.uuid4()), "school_id": sid, "name": str(r.get("name", "")).strip(),
                     "nis": nis, "nisn": str(r.get("nisn", "")).strip(),
                     "gender": _norm_gender(str(r.get("gender", ""))), "class": str(r.get("class", "")).strip()})
        if nis:
            existing.add(nis)
    if docs:
        await db.students.insert_many(docs)
    return {"inserted": len(docs)}


# ---------- Leaves ----------
@router.get("/admin/leaves")
async def list_leaves(user: dict = Depends(admin_dep)):
    return await db.leaves.find({"school_id": user["school_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


class DecisionIn(BaseModel):
    status: str  # approved | rejected


@router.post("/admin/leaves/{lid}/decision")
async def decide_leave(lid: str, body: DecisionIn, user: dict = Depends(admin_dep)):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status tidak valid")
    res = await db.leaves.update_one(
        {"id": lid, "school_id": user["school_id"]},
        {"$set": {"status": body.status, "decided_by": user["id"], "decided_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    return {"ok": True}


# ---------- Reports ----------
@router.get("/admin/reports/attendance")
async def report_attendance(date_from: str, date_to: str, teacher_id: str | None = None,
                            user: dict = Depends(admin_dep)):
    q = {"school_id": user["school_id"], "date": {"$gte": date_from, "$lte": date_to}}
    if teacher_id:
        q["teacher_id"] = teacher_id
    rows = await db.attendance.find(q, {"_id": 0, "photo": 0}).sort([("date", 1), ("ts_server", 1)]).to_list(10000)
    students = {s["id"]: s for s in await db.students.find(
        {"school_id": user["school_id"]}, {"_id": 0, "id": 1, "nisn": 1, "gender": 1}).to_list(10000)}
    for r in rows:
        r["time"] = r.get("time_local") or r.get("ts_device", r.get("ts_server", ""))[11:16]
        st = students.get(r.get("student_id"))
        if st:
            r["nisn"] = st.get("nisn", "")
            r["gender"] = st.get("gender", "")
    return rows


@router.get("/admin/reports/export")
async def report_export(format: str, date_from: str, date_to: str, user: dict = Depends(admin_dep)):
    rows = await report_attendance(date_from, date_to, None, user)
    if format == "xlsx":
        df = pd.DataFrame([{
            "Tanggal": r.get("date"), "Nama": r.get("teacher_name"), "NISN": r.get("nisn", ""),
            "L/P": r.get("gender", ""), "Tipe": r.get("type"),
            "Jam": r.get("time"), "Status": r.get("status"), "Telat (mnt)": r.get("late_minutes", 0),
            "Lembur (mnt)": r.get("overtime_minutes", 0), "Offline": "Ya" if r.get("offline") else "Tidak",
        } for r in rows])
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=laporan-absensi.xlsx"})
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "name": 1})
    path = build_report_pdf(f"/tmp/report_{user['school_id']}.pdf", school["name"], date_from, date_to, rows)
    return FileResponse(path, media_type="application/pdf", filename="laporan-absensi.pdf")
