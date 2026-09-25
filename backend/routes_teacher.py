import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from auth import require_roles
from db import db
from pdfgen import build_report_pdf
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
        {"school_id": user["school_id"], "status": {"$ne": "lulus"}}, {"_id": 0, "id": 1, "name": 1, "nis": 1, "class": 1}
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


def _class_list(t: dict) -> list:
    return [c.strip() for c in (t.get("classes") or "").split(",") if c.strip()]


@router.get("/teacher/my-classes")
async def my_classes(user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    return {"classes": _class_list(t)}


async def _report_rows(user: dict, date_from: str, date_to: str, class_name: str | None):
    t = await my_teacher(user)
    classes = _class_list(t)
    if not classes:
        return [], []
    if class_name and class_name not in classes:
        raise HTTPException(status_code=403, detail="Kelas tidak diampu")
    allowed = [class_name] if class_name else classes
    q = {"school_id": user["school_id"], "person_type": "student", "class": {"$in": allowed},
         "date": {"$gte": date_from, "$lte": date_to}}
    rows = await db.attendance.find(q, {"_id": 0, "photo": 0}).sort([("date", 1), ("ts_server", 1)]).to_list(10000)
    students = await db.students.find(
        {"school_id": user["school_id"], "class": {"$in": allowed}, "status": {"$ne": "lulus"}},
        {"_id": 0, "id": 1, "name": 1, "nis": 1, "nisn": 1, "gender": 1, "class": 1}).to_list(5000)
    smap = {s["id"]: s for s in students}
    for r in rows:
        r["time"] = r.get("time_local") or r.get("ts_device", r.get("ts_server", ""))[11:16]
        st = smap.get(r.get("student_id"))
        if st:
            r["nisn"] = st.get("nisn", "")
            r["gender"] = st.get("gender", "")
    return rows, students


@router.get("/teacher/report/attendance")
async def teacher_report_attendance(date_from: str, date_to: str, class_name: str | None = None,
                                    user: dict = Depends(teacher_dep)):
    rows, _ = await _report_rows(user, date_from, date_to, class_name)
    return rows


@router.get("/teacher/report/recap")
async def teacher_report_recap(date_from: str, date_to: str, class_name: str | None = None,
                               user: dict = Depends(teacher_dep)):
    rows, students = await _report_rows(user, date_from, date_to, class_name)
    active_days = {r["date"] for r in rows}
    recap = []
    for s in students:
        rs = [r for r in rows if r.get("student_id") == s["id"]]
        hadir = {r["date"] for r in rs if r.get("att_status", "present") == "present"}
        telat = {r["date"] for r in rs if r.get("att_status", "present") == "present" and r.get("late_minutes", 0) > 0}
        sakit = {r["date"] for r in rs if r.get("att_status") == "sakit"}
        izin = {r["date"] for r in rs if r.get("att_status") == "izin"}
        alpha = max(0, len(active_days) - len(hadir | sakit | izin))
        recap.append({"id": s["id"], "name": s["name"], "nis": s.get("nis", ""), "class": s.get("class", ""),
                      "hadir": len(hadir), "telat": len(telat), "sakit": len(sakit), "izin": len(izin),
                      "alpha": alpha, "active_days": len(active_days)})
    recap.sort(key=lambda r: (r["class"], r["name"]))
    return recap


@router.get("/teacher/report/export")
async def teacher_report_export(format: str, date_from: str, date_to: str, class_name: str | None = None,
                                user: dict = Depends(teacher_dep)):
    rows, _ = await _report_rows(user, date_from, date_to, class_name)
    if format == "xlsx":
        df = pd.DataFrame([{
            "Tanggal": r.get("date"), "Nama": r.get("teacher_name"), "Kelas": r.get("class", ""),
            "NISN": r.get("nisn", ""), "L/P": r.get("gender", ""),
            "Jam": r.get("time"), "Status": r.get("att_status") or r.get("status"),
            "Telat (mnt)": r.get("late_minutes", 0), "Offline": "Ya" if r.get("offline") else "Tidak",
        } for r in rows])
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=laporan-siswa.xlsx"})
    school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0, "name": 1})
    path = build_report_pdf(f"/tmp/report_teacher_{user['school_id']}.pdf", school["name"], date_from, date_to, rows)
    return FileResponse(path, media_type="application/pdf", filename="laporan-siswa.pdf")


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


# ---------- Absensi per Mata Pelajaran ----------
def _subject_list(t: dict) -> list:
    return [c.strip() for c in (t.get("subject") or "").split(",") if c.strip()]


@router.get("/teacher/subject-att/meta")
async def subject_att_meta(user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    return {"subjects": _subject_list(t), "classes": _class_list(t), "gender": t.get("gender", "")}


# ---------- TTS cloud untuk voice panggil (ElevenLabs eleven_multilingual_v2: pria=Adam / wanita=Sarah) ----------
TTS_DIR = "/app/backend/assets/tts"
TTS_VOICES = {"L": "pNInz6obpgDQGcFmaJgB", "P": "EXAVITQu4vr4xnSDxMaL"}


class TtsIn(BaseModel):
    text: str


def _tts_key(text: str, voice: str) -> str:
    import hashlib
    return hashlib.sha256(f"{text}|{voice}|eleven_multilingual_v2|el|mp3".encode()).hexdigest()


@router.post("/teacher/tts")
async def teacher_tts(body: TtsIn, user: dict = Depends(teacher_dep)):
    import os
    import re
    t = await my_teacher(user)
    voice = TTS_VOICES.get(t.get("gender", ""), "EXAVITQu4vr4xnSDxMaL")
    text = re.sub(r"\s+", " ", re.sub(r"[*_#>~|`]", "", re.sub(r"https?://\S+", "", body.text or ""))).strip()[:120]
    if not text:
        raise HTTPException(status_code=422, detail="text_empty")
    key = _tts_key(text, voice)
    path = f"{TTS_DIR}/{key}.mp3"
    if not os.path.exists(path):
        import asyncio
        import requests
        def _gen():
            r = requests.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
                json={"text": text, "model_id": "eleven_multilingual_v2",
                      "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
                timeout=30,
            )
            r.raise_for_status()
            return r.content
        audio = await asyncio.to_thread(_gen)
        with open(path, "wb") as f:
            f.write(audio)
    return {"url": f"/api/teacher/tts-file/{key}.mp3"}


@router.get("/teacher/tts-file/{fname}")
async def teacher_tts_file(fname: str):
    import os
    import re
    if not re.fullmatch(r"[0-9a-f]{64}\.mp3", fname):
        raise HTTPException(status_code=404, detail="not_found")
    path = f"{TTS_DIR}/{fname}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="not_found")
    return FileResponse(path, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=31536000"})


@router.get("/teacher/subject-att")
async def subject_att_get(date: str, subject: str, class_name: str, user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    if subject not in _subject_list(t):
        raise HTTPException(status_code=403, detail="Mapel tidak diampu")
    if class_name not in _class_list(t):
        raise HTTPException(status_code=403, detail="Kelas tidak diampu")
    students = await db.students.find(
        {"school_id": user["school_id"], "class": class_name, "status": {"$ne": "lulus"}},
        {"_id": 0, "id": 1, "name": 1, "nis": 1}).sort("name", 1).to_list(500)
    recs = await db.subject_attendance.find(
        {"school_id": user["school_id"], "teacher_id": t["id"], "date": date,
         "subject": subject, "class_name": class_name}, {"_id": 0}).to_list(500)
    daily = await db.attendance.find(
        {"school_id": user["school_id"], "person_type": "student", "date": date, "type": "in"},
        {"_id": 0, "student_id": 1, "att_status": 1}).to_list(10000)
    dmap = {r["student_id"]: r.get("att_status", "present") for r in daily}
    to_subject = {"present": "hadir", "sakit": "sakit", "izin": "izin", "alpa": "alpha"}
    prefill = {s["id"]: to_subject.get(dmap.get(s["id"], "alpa"), "hadir") for s in students}
    return {"students": students, "records": {r["student_id"]: r["status"] for r in recs},
            "prefill": prefill, "saved": bool(recs), "locked": bool(recs and recs[0].get("locked"))}


@router.get("/teacher/subject-att/export")
async def subject_att_export(date: str, subject: str, class_name: str, user: dict = Depends(teacher_dep)):
    import io as _io
    from openpyxl import Workbook
    from fastapi.responses import StreamingResponse
    t = await my_teacher(user)
    if subject not in _subject_list(t):
        raise HTTPException(status_code=403, detail="Mapel tidak diampu")
    if class_name not in _class_list(t):
        raise HTTPException(status_code=403, detail="Kelas tidak diampu")
    recs = await db.subject_attendance.find(
        {"school_id": user["school_id"], "teacher_id": t["id"], "date": date,
         "subject": subject, "class_name": class_name}, {"_id": 0}).sort("student_name", 1).to_list(500)
    if not recs:
        raise HTTPException(status_code=404, detail="no_data")
    wb = Workbook()
    ws = wb.active
    ws.title = "Absensi Mapel"
    ws.append(["Absensi Mata Pelajaran"])
    ws.append(["Guru", t["name"], "Mapel", subject, "Kelas", class_name, "Tanggal", date])
    ws.append([])
    ws.append(["No", "Nama Siswa", "NIS", "Status"])
    for i, r in enumerate(recs, 1):
        ws.append([i, r.get("student_name", ""), r.get("nis", ""), r.get("status", "")])
    for col, w in zip("ABCD", (6, 32, 16, 12)):
        ws.column_dimensions[col].width = w
    bio = _io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    fname = f"absen-mapel-{subject}-{class_name}-{date}.xlsx".replace(" ", "_").replace("/", "-")
    return StreamingResponse(bio, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@router.get("/teacher/subject-att/recap-export")
async def subject_att_recap_export(month: str, subject: str, class_name: str, user: dict = Depends(teacher_dep)):
    import io as _io
    import re as _re
    import calendar as _cal
    from openpyxl import Workbook
    from fastapi.responses import StreamingResponse
    t = await my_teacher(user)
    if subject not in _subject_list(t):
        raise HTTPException(status_code=403, detail="Mapel tidak diampu")
    if class_name not in _class_list(t):
        raise HTTPException(status_code=403, detail="Kelas tidak diampu")
    if not _re.match(r"^\d{4}-\d{2}$", month or ""):
        raise HTTPException(status_code=422, detail="invalid_month")
    y, m = map(int, month.split("-"))
    ndays = _cal.monthrange(y, m)[1]
    dates = [f"{month}-{d:02d}" for d in range(1, ndays + 1)]
    recs = await db.subject_attendance.find(
        {"school_id": user["school_id"], "teacher_id": t["id"], "subject": subject,
         "class_name": class_name, "date": {"$regex": f"^{month}-"}},
        {"_id": 0, "student_id": 1, "student_name": 1, "nis": 1, "date": 1, "status": 1}).to_list(20000)
    if not recs:
        raise HTTPException(status_code=404, detail="no_data")
    per = {}
    for r in recs:
        per.setdefault(r["student_id"], {"name": r.get("student_name", ""), "nis": r.get("nis", ""), "days": {}})["days"][r["date"]] = r["status"]
    abbr = {"hadir": "H", "sakit": "S", "izin": "I", "alpha": "A"}
    wb = Workbook()
    ws = wb.active
    ws.title = "Rekap Bulanan"
    ws.append(["Rekap Absensi Mata Pelajaran (Bulanan)"])
    ws.append(["Guru", t["name"], "Mapel", subject, "Kelas", class_name, "Bulan", month])
    ws.append([])
    ws.append(["No", "Nama Siswa", "NIS"] + [str(d) for d in range(1, ndays + 1)] + ["H", "S", "I", "A"])
    for i, st in enumerate(sorted(per.values(), key=lambda x: x["name"]), 1):
        counts = {"hadir": 0, "sakit": 0, "izin": 0, "alpha": 0}
        row = [i, st["name"], st["nis"]]
        for d in dates:
            v = st["days"].get(d, "")
            row.append(abbr.get(v, ""))
            if v in counts:
                counts[v] += 1
        ws.append(row + [counts["hadir"], counts["sakit"], counts["izin"], counts["alpha"]])
    ws.column_dimensions["A"].width = 6
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 14
    bio2 = _io.BytesIO()
    wb.save(bio2)
    bio2.seek(0)
    fname2 = f"rekap-mapel-{subject}-{class_name}-{month}.xlsx".replace(" ", "_").replace("/", "-")
    return StreamingResponse(bio2, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f'attachment; filename="{fname2}"'})


class SubjectAttIn(BaseModel):
    date: str
    subject: str
    class_name: str
    records: list  # [{student_id, status: hadir|sakit|izin|alpha}]
    lock: bool | None = None  # None=tidak diubah, True=kunci, False=buka kunci


@router.post("/teacher/subject-att")
async def subject_att_save(body: SubjectAttIn, user: dict = Depends(teacher_dep)):
    t = await my_teacher(user)
    if body.subject not in _subject_list(t):
        raise HTTPException(status_code=403, detail="Mapel tidak diampu")
    if body.class_name not in _class_list(t):
        raise HTTPException(status_code=403, detail="Kelas tidak diampu")
    valid = {s["id"]: s for s in await db.students.find(
        {"school_id": user["school_id"], "class": body.class_name, "status": {"$ne": "lulus"}},
        {"_id": 0, "id": 1, "name": 1, "nis": 1}).to_list(500)}
    now = datetime.now(timezone.utc).isoformat()
    saved = 0
    for r in body.records:
        st = valid.get(r.get("student_id"))
        status = r.get("status")
        if not st or status not in ("hadir", "sakit", "izin", "alpha"):
            continue
        key = {"school_id": user["school_id"], "teacher_id": t["id"], "date": body.date,
               "subject": body.subject, "class_name": body.class_name, "student_id": st["id"]}
        setters = {**key, "student_name": st["name"], "nis": st.get("nis", ""),
                   "teacher_name": t["name"], "status": status, "updated_at": now}
        update = {"$set": setters,
                  "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}}
        if body.lock is True:
            setters["locked"] = True
        elif body.lock is False:
            update["$unset"] = {"locked": ""}
        await db.subject_attendance.update_one(key, update, upsert=True)
        saved += 1
        # HSIA final: status harian siswa mengikuti penandaan guru mapel terakhir
        daily_status = {"hadir": "present", "sakit": "sakit", "izin": "izin", "alpha": "alpa"}[status]
        existing = await db.attendance.find_one(
            {"school_id": user["school_id"], "student_id": st["id"], "date": body.date, "type": "in"})
        if existing:
            await db.attendance.update_one({"id": existing["id"]}, {"$set": {"att_status": daily_status}})
        else:
            try:
                await _record({"id": user["school_id"]}, st["id"], st["name"], "in", f"{body.date}T07:00:00",
                              0, 0, "", uuid.uuid4().hex, offline=False, manual=True,
                              extra={"person_type": "student", "class": body.class_name, "att_status": daily_status,
                                     "note": f"Absen mapel {body.subject}",
                                     "recorded_by": t["id"], "recorded_by_name": t["name"]})
            except HTTPException:
                pass
    return {"ok": True, "saved": saved}
