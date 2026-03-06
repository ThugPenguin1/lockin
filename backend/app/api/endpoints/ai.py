from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import generate_coaching_message, generate_session_summary

router = APIRouter(prefix="/ai", tags=["ai"])


class CoachRequest(BaseModel):
    focus_score: float = 80.0
    minutes_elapsed: int = 10
    friends: list[str] = []
    friend_scores: list[float] = []
    todos_completed: int = 0
    todos_total: int = 0
    recent_trend: str = "stable"


class SummaryRequest(BaseModel):
    focus_score: float = 80.0
    total_minutes: int = 30
    focus_minutes: int = 25
    ranking: int = 1
    squad_size: int = 3
    nudges_received: int = 2
    friends: list[str] = []
    friend_scores: list[float] = []


@router.post("/coach")
async def get_coaching(
    data: CoachRequest,
    current_user: User = Depends(get_current_user),
):
    result = await generate_coaching_message(
        user_name=current_user.display_name,
        focus_score=data.focus_score,
        minutes_elapsed=data.minutes_elapsed,
        friends=data.friends,
        friend_scores=data.friend_scores,
        todos_completed=data.todos_completed,
        todos_total=data.todos_total,
        recent_trend=data.recent_trend,
    )
    return result


@router.post("/summary")
async def get_ai_summary(
    data: SummaryRequest,
    current_user: User = Depends(get_current_user),
):
    insight = await generate_session_summary(
        user_name=current_user.display_name,
        focus_score=data.focus_score,
        total_minutes=data.total_minutes,
        focus_minutes=data.focus_minutes,
        ranking=data.ranking,
        squad_size=data.squad_size,
        nudges_received=data.nudges_received,
        friends=data.friends,
        friend_scores=data.friend_scores,
    )
    return {"insight": insight, "model": "deepseek-chat"}
