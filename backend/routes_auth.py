from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from db import db
from auth import verify_password, create_token, get_current_user

router = APIRouter(tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": create_token(user), "user": user}


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user
