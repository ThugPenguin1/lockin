from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserPublic


class SquadCreate(BaseModel):
    name: str
    description: str = ""
    avatar_emoji: str = "📚"


class SquadJoin(BaseModel):
    invite_code: str


class SquadResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_id: int
    description: str
    avatar_emoji: str
    created_at: datetime
    members: List[UserPublic] = []
    active_session_count: Optional[int] = 0

    class Config:
        from_attributes = True
