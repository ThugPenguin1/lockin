from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    display_name: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    display_name: str
    avatar_url: str
    is_online: bool
    current_session_id: Optional[int]
    total_focus_minutes: int
    current_streak: int
    longest_streak: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str
    is_online: bool
    current_session_id: Optional[int]
    total_focus_minutes: int
    current_streak: int

    class Config:
        from_attributes = True
