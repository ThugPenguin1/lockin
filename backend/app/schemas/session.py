from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserPublic


class SessionCreate(BaseModel):
    squad_id: int
    session_type: str = "open"


class ParticipantStatus(BaseModel):
    user: UserPublic
    focus_score: float
    total_focus_seconds: int
    is_active: bool
    joined_at: datetime
    status_label: str = "Focused"


class SessionResponse(BaseModel):
    id: int
    squad_id: int
    started_by: int
    started_at: datetime
    ended_at: Optional[datetime]
    is_active: bool
    session_type: str
    participants: List[ParticipantStatus] = []

    class Config:
        from_attributes = True


class ParticipantResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    focus_score: float
    total_focus_seconds: int
    total_distracted_seconds: int
    nudges_received: int
    nudges_responded: int
    is_active: bool

    class Config:
        from_attributes = True


class AttentionUpdate(BaseModel):
    session_id: int
    attention_score: float
    is_focused: bool
    gaze_x: Optional[float] = None
    gaze_y: Optional[float] = None
    head_pitch: Optional[float] = None
    head_yaw: Optional[float] = None


class NudgeResponse(BaseModel):
    id: int
    message: str
    nudge_type: str
    timestamp: datetime

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    session_id: int
    total_duration_minutes: float
    focus_score: float
    total_focus_minutes: float
    total_distracted_minutes: float
    nudges_received: int
    nudges_responded: int
    squad_ranking: int
    squad_size: int
    streak_count: int
    is_personal_best: bool
    ai_insight: str
    participants_summary: List[dict]
