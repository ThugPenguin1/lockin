from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.session import SessionParticipant, FocusSession
from ml.productivity_analyzer import analyzer

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/recommendations")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SessionParticipant)
        .where(SessionParticipant.user_id == current_user.id)
        .order_by(SessionParticipant.joined_at.desc())
        .limit(50)
        .options(selectinload(SessionParticipant.session).selectinload(FocusSession.participants))
    )
    participations = result.scalars().all()

    if len(participations) < 5:
        return {
            "recommendations": [
                {"type": "general", "message": f"Complete {5 - len(participations)} more sessions to unlock AI-powered insights!"}
            ],
            "sessions_analyzed": len(participations),
        }

    sessions_data = []
    focus_scores = []
    recent_scores = []

    for i, p in enumerate(participations):
        if i < 5:
            recent_scores.append(p.focus_score)

        session = p.session
        partner_ids = [
            sp.user_id for sp in session.participants
            if sp.user_id != current_user.id
        ] if session else []

        joined = p.joined_at
        sessions_data.append({
            "hour_of_day": joined.hour if joined else 12,
            "day_of_week": joined.weekday() if joined else 0,
            "group_size": len(session.participants) if session else 1,
            "session_duration_minutes": (p.total_focus_seconds + p.total_distracted_seconds) / 60,
            "partner_ids": partner_ids,
            "user_avg_score_last_5": sum(recent_scores) / max(len(recent_scores), 1),
        })
        focus_scores.append(p.focus_score)

    recommendations = analyzer.get_recommendations(sessions_data, focus_scores)

    return {
        "recommendations": recommendations,
        "sessions_analyzed": len(participations),
        "avg_focus_score": round(sum(focus_scores) / len(focus_scores), 1),
    }


@router.get("/predict")
async def predict_session(
    hour: int = 14,
    group_size: int = 3,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    context = {
        "hour_of_day": hour,
        "day_of_week": now.weekday(),
        "group_size": group_size,
        "session_duration_minutes": 60,
        "partner_ids": [],
        "user_avg_score_last_5": 70,
    }

    predicted = analyzer.predict_focus_score(context)
    return {
        "predicted_focus_score": round(predicted, 1),
        "context": context,
    }
