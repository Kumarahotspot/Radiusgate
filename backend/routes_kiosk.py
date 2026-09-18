import math
import uuid
import logging
from datetime import datetime, timezone
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


def _late_overtime(settings, att_type, ts_iso):
    late, overtime = 0, 0
    if not settings:
        return late, overtime
    try:
        m = int(ts_iso[11:13]) * 60 + int(ts_iso[14:16])
        ws_h, ws_m = map(int, settings.get("work_start", "07:00").split(":"))
        we_h, we_m = map(int, settings.get("work_end", "15:00").split(":"))
        start, end = ws_h * 60 + ws_m, we_h * 60 + we_m
        if end <= start:  # shift malam, mis. 21:00 - 00:00
            end += 1440
        if m < start and (start - m) > 720:  # lewat tengah malam untuk shift kemarin
            m += 1440
        tol = int(settings.get("late_tolerance_min", 10))
        if att_type == "in":
            late = max(0, m - (start + tol))
        else:
            overtime = max(0, m - end)
    except Exception:
        pass
    return late, overtime


async def _record(school, teacher_id, teacher_name, att_type, ts_device, lat, lng, photo,
                  client_uuid, offline, skip_face=False):
    sid = school["id"]
    date = ts_device[:10]
    dup = await db.attendance.find_one({"teacher_id": teacher_id, "date": date, "type": att_type})
    if dup:
        raise HTTPException(status_code=409, detail="already_recorded")
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
    settings = await db.settings.find_one({"school_id": sid}, {"_id": 0})
    if att_type == "in" and settings:
        m_local = int(ts_device[11:13]) * 60 + int(ts_device[14:16])
        ws_h, ws_m = map(int, settings.get("work_start", "07:00").split(":"))
        earliest = ws_h * 60 + ws_m - int(settings.get("early_checkin_min", 60))
        if m_local < earliest:
            eh, em = divmod(max(earliest, 0), 60)
            raise HTTPException(status_code=422, detail=f"too_early:{eh:02d}:{em:02d}")
    late, overtime = _late_overtime(settings, att_type, ts_device)
    if att_type == "in" and status == "ok" and late > 0:
        status = "late"
    doc = {
        "id": str(uuid.uuid4()), "school_id": sid, "teacher_id": teacher_id,
        "teacher_name": teacher_name, "type": att_type, "date": date,
        "ts_server": now_iso(), "ts_device": ts_device, "lat": lat, "lng": lng,
        "photo": photo, "status": status, "late_minutes": late, "overtime_minutes": overtime,
        "offline": offline, "client_uuid": client_uuid,
    }
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
    if not teachers:
        raise HTTPException(status_code=422, detail="no_enrolled")
    try:
        cap = ahash(body.photo)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_photo")
    best, best_d = None, 10 ** 9
    for t in teachers:
        d = hamming(cap, t["embedding"])
        if d < best_d:
            best, best_d = t, d
    if best is None or best_d > MATCH_THRESHOLD:
        logger.warning("face match gagal: best_distance=%s threshold=%s enrolled=%s", best_d, MATCH_THRESHOLD, len(teachers))
        raise HTTPException(status_code=422, detail="face_not_found")
    logger.info("face match: teacher=%s distance=%s", best["name"], best_d)
    date = body.ts_device[:10]
    if await db.attendance.find_one({"teacher_id": best["id"], "date": date, "type": body.type}):
        raise HTTPException(status_code=409, detail=f"already_recorded:{best['name']}")
    doc = await _record(school, best["id"], best["name"], body.type, body.ts_device,
                        body.lat, body.lng, body.photo, body.client_uuid, offline=False)
    return {"ok": True, "teacher_name": best["name"], "status": doc["status"],
            "late_minutes": doc["late_minutes"], "overtime_minutes": doc["overtime_minutes"],
            "match_distance": best_d}


class SyncIn(BaseModel):
    records: List[dict]


@router.post("/kiosk/sync")
async def sync(body: SyncIn, request: Request):
    school = await school_by_token(request)
    results = []
    for r in body.records:
        try:
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
