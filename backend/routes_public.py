import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from db import db

router = APIRouter()


class LeadIn(BaseModel):
    school_name: str
    contact_person: str
    email: EmailStr
    phone: str = ""
    student_count: int | None = None
    message: str = ""


@router.post("/public/leads")
async def create_lead(body: LeadIn):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.leads.insert_one(doc)
    return {"ok": True}
