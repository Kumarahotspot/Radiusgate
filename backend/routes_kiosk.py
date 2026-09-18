import math
import uuid
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List
from pymongo.errors import DuplicateKeyError
from db import db
from faceutil import ahash, hamming, MATCH_THRESHOLD

logger = logging.getLogger(__name__)
router = APIRouter(tags=["kiosk"])


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def _localize(ts_iso: str, tz_name: str):
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Asia/Jakarta")
    try:
        dt = datetime.fromisoformat(str(ts_iso).replace("Z", "+00:00"))
        # tanpa offset = dianggap sudah waktu lokal sekolah; dengan offset (UTC 'Z') = dikonversi
        dt = dt.replace(tzinfo=tz) if dt.tzinfo is None else dt.astimezone(tz)
    except Exception:
        dt = datetime.now(timezone.utc).astimezone(tz)
    return dt.date().isoformat(), dt.hour * 60 + dt.minute, dt.strftime("%H:%M")


def haversine_m(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def school_by_token(request: Request) -> dict:
    token = request.headers.get("X-Kiosk-Token", "")
    school = await db.schools.find_one({"kiosk_token": token}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=401, detail="Kode kiosk tidak valid")
    return school


@router.get("/kiosk/info")
async def kiosk_info(request: Request):
    school = await school_by_token(request)
    locations = await db.locations.find({"school_id": school["id"]}, {"_id": 0}).to_list(100)
    settings = await db.settings.find_one({"school_id": school["id"]}, {"_id": 0})
    return {"school": {"id": school["id"], "name": school["name"]}, "locations": locations, "settings": settings}


@router.get("/kiosk/teachers")
async def kiosk_teachers(request: Request):
    school = await school_by_token(request)
    return await db.teachers.find(
        {"school_id": school["id"], "active": True}, {"_id": 0, "id": 1, "name": 1, "photo": 1}
    ).to_list(1000)


class AttendIn(BaseModel):
    photo: str
    lat: float
    lng: float
    type: str  # in | out
    ts_device: str
    client_uuid: str


def _geofence_check(locations, lat, lng):
    if not locations:
        return True, None
    best = None
    for loc in locations:
        d = haversine_m(lat, lng, loc["lat"], loc["lng"])
        if best is None or d < best[0]:
            best = (d, loc)
        if d <= loc.get("radius_m", 50):
            return True, loc
    return False, best[1] if best else None


def _closest_on_clock(m: int, anchor: int) -> int:
    return min((m, m - 1440, m + 1440), key=lambda c: abs(c - anchor))


def _late_overtime(settings, att_type, m):
    late, overtime = 0, 0
    if not settings:
        return late, overtime
    try:
        ws_h, ws_m = map(int, settings.get("work_start", "07:00").split(":"))
        we_h, we_m = map(int, settings.get("work_end", "15:00").split(":"))
        start, end = ws_h * 60 + ws_m, we_h * 60 + we_m
        if end <= start:  # shift malam, mis. 21:00 - 00:00
            end += 1440
        tol = int(settings.get("late_tolerance_min", 10))
        if att_type == "in":
            late = max(0, _closest_on_clock(m, start) - (start + tol))
        else:
            overtime = max(0, _closest_on_clock(m, end) - end)
    except Exception:
        pass
    return late, overtime


async def _record(school, teacher_id, teacher_name, att_type, ts_device, lat, lng, photo,
                  client_uuid, offline, extra=None, manual=False):
    sid = school["id"]
    settings = await db.settings.find_one({"school_id": sid}, {"_id": 0})
    tz_name = (settings or {}).get("timezone", "Asia/Jakarta")
    date, minutes, hhmm = _localize(ts_device, tz_name)
    ptype = (extra or {}).get("person_type", "teacher")
    dup_field = "student_id" if ptype == "student" else "teacher_id"
    dup = await db.attendance.find_one({dup_field: teacher_id, "date": date, "type": att_type})
    if dup:
        raise HTTPException(status_code=409, detail="already_recorded")
    if manual:
        status = "ok"
    else:
        locations = await db.locations.find({"school_id": sid}, {"_id": 0}).to_list(100)
        ok, nearest = _geofence_check(locations, lat, lng)
        if not ok:
            dist = int(haversine_m(lat, lng, nearest["lat"], nearest["lng"])) if nearest else None
            if offline:
                status = "rejected_geofence"
            else:
                raise HTTPException(status_code=422, detail=f"outside_geofence:{dist}")
        else:
            status = "ok"
    if att_type == "in" and settings and not manual:
        ws_h, ws_m = map(int, settings.get("work_start", "07:00").split(":"))
        earliest = ws_h * 60 + ws_m - int(settings.get("early_checkin_min", 60))
        if minutes < earliest:
            eh, em = divmod(max(earliest, 0), 60)
            sisa = earliest - minutes
            raise HTTPException(status_code=422, detail=f"too_early:{eh:02d}:{em:02d}:{sisa}")
    att_status = (extra or {}).get("att_status", "present")
    late, overtime = _late_overtime(settings, att_type, minutes)
    if att_status in ("sakit", "izin"):
        late, overtime = 0, 0
    if att_type == "in" and status == "ok" and late > 0:
        status = "late"
    doc = {
        "id": str(uuid.uuid4()), "school_id": sid, "teacher_id": teacher_id,
        "teacher_name": teacher_name, "type": att_type, "date": date, "time_local": hhmm,
        "tz": tz_name,
        "ts_server": now_iso(), "ts_device": ts_device, "lat": lat, "lng": lng,
        "photo": photo, "status": status, "late_minutes": late, "overtime_minutes": overtime,
        "offline": offline, "client_uuid": client_uuid, "person_type": ptype,
    }
    if ptype == "student":
        doc["student_id"] = doc.pop("teacher_id")
    if extra:
        doc.update({k: v for k, v in extra.items() if k != "person_type"})
    try:
        await db.attendance.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="already_recorded")
    return doc


@router.post("/kiosk/attend")
async def attend(body: AttendIn, request: Request):
    school = await school_by_token(request)
    teachers = await db.teachers.find(
        {"school_id": school["id"], "active": True, "embedding": {"$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "embedding": 1}).to_list(1000)
    students = await db.students.find(
        {"school_id": school["id"], "embedding": {"$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "class": 1, "embedding": 1}).to_list(5000)
    if not teachers and not students:
        raise HTTPException(status_code=422, detail="no_enrolled")
    try:
        cap = ahash(body.photo)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_photo")
    best, best_d, best_type = None, 10 ** 9, None
    for t in teachers:
        d = hamming(cap, t["embedding"])
        if d < best_d:
            best, best_d, best_type = t, d, "teacher"
    for s in students:
        d = hamming(cap, s["embedding"])
        if d < best_d:
            best, best_d, best_type = s, d, "student"
    if best is None or best_d > MATCH_THRESHOLD:
        logger.warning("face match gagal: best_distance=%s threshold=%s", best_d, MATCH_THRESHOLD)
        raise HTTPException(status_code=422, detail="face_not_found")
    logger.info("face match: %s=%s distance=%s", best_type, best["name"], best_d)
    ksettings = await db.settings.find_one({"school_id": school["id"]}, {"_id": 0, "timezone": 1})
    date, _, _ = _localize(body.ts_device, (ksettings or {}).get("timezone", "Asia/Jakarta"))
    dup_field = "teacher_id" if best_type == "teacher" else "student_id"
    if await db.attendance.find_one({dup_field: best["id"], "date": date, "type": body.type}):
        raise HTTPException(status_code=409, detail=f"already_recorded:{best['name']}")
    extra = None
    if best_type == "student":
        extra = {"person_type": "student", "class": best.get("class", ""), "att_status": "present"}
    doc = await _record(school, best["id"], best["name"], body.type, body.ts_device,
                        body.lat, body.lng, body.photo, body.client_uuid, offline=False, extra=extra)
    return {"ok": True, "teacher_name": best["name"], "person_type": best_type, "status": doc["status"],
            "late_minutes": doc["late_minutes"], "overtime_minutes": doc["overtime_minutes"],
            "match_distance": best_d}


class AttendStudentIn(BaseModel):
    nis: str
    status: str = "present"  # present | sakit | izin
    lat: float
    lng: float
    ts_device: str
    client_uuid: str


@router.post("/kiosk/attend-student")
async def attend_student(body: AttendStudentIn, request: Request):
    school = await school_by_token(request)
    student = await db.students.find_one({"school_id": school["id"], "nis": body.nis.strip()})
    if not student:
        raise HTTPException(status_code=422, detail="student_not_found")
    att_status = body.status if body.status in ("present", "sakit", "izin") else "present"
    doc = await _record(school, student["id"], student["name"], "in", body.ts_device,
                        body.lat, body.lng, "", body.client_uuid, offline=False,
                        extra={"person_type": "student", "class": student.get("class", ""), "att_status": att_status})
    return {"ok": True, "student_name": student["name"], "status": doc["status"],
            "att_status": att_status, "late_minutes": doc["late_minutes"]}


class SyncIn(BaseModel):
    records: List[dict]


@router.post("/kiosk/sync")
async def sync(body: SyncIn, request: Request):
    school = await school_by_token(request)
    results = []
    for r in body.records:
        try:
            if r.get("person_type") == "student":
                st = await db.students.find_one({"school_id": school["id"], "nis": str(r.get("nis", "")).strip()}, {"_id": 0})
                if not st:
                    results.append({"client_uuid": r.get("client_uuid"), "ok": False, "reason": "student_not_found"})
                    continue
                doc = await _record(school, st["id"], st["name"], "in", r["ts_device"], r["lat"], r["lng"],
                                    "", r["client_uuid"], offline=True,
                                    extra={"person_type": "student", "class": st.get("class", ""),
                                           "att_status": r.get("status", "present")})
                results.append({"client_uuid": r["client_uuid"], "ok": True, "status": doc["status"]})
                continue
            t = await db.teachers.find_one({"id": r.get("teacher_id"), "school_id": school["id"]}, {"_id": 0})
            if not t:
                results.append({"client_uuid": r.get("client_uuid"), "ok": False, "reason": "teacher_not_found"})
                continue
            doc = await _record(school, t["id"], t["name"], r["type"], r["ts_device"], r["lat"], r["lng"],
                                r.get("photo", ""), r["client_uuid"], offline=True)
            results.append({"client_uuid": r["client_uuid"], "ok": True, "status": doc["status"]})
        except HTTPException as e:
            results.append({"client_uuid": r.get("client_uuid"), "ok": e.status_code != 409, "reason": e.detail})
    return {"results": results}
