from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.session import FocusSession, SessionParticipant, AttentionLog

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total_result = await db.execute(
        select(
            func.count(SessionParticipant.id),
            func.coalesce(func.sum(SessionParticipant.total_focus_seconds), 0),
            func.coalesce(func.avg(SessionParticipant.focus_score), 0),
        ).where(SessionParticipant.user_id == current_user.id)
    )
    total_sessions, total_focus_secs, avg_score = total_result.first()

    week_result = await db.execute(
        select(
            func.count(SessionParticipant.id),
            func.coalesce(func.sum(SessionParticipant.total_focus_seconds), 0),
            func.coalesce(func.avg(SessionParticipant.focus_score), 0),
        )
        .where(SessionParticipant.user_id == current_user.id)
        .where(SessionParticipant.joined_at >= week_ago)
    )
    week_sessions, week_focus_secs, week_avg_score = week_result.first()

    solo_result = await db.execute(
        select(func.coalesce(func.avg(SessionParticipant.focus_score), 0))
        .join(FocusSession)
        .where(SessionParticipant.user_id == current_user.id)
        .where(
            select(func.count(SessionParticipant.id))
            .where(SessionParticipant.session_id == FocusSession.id)
            .correlate(FocusSession)
            .scalar_subquery() == 1
        )
    )
    solo_avg = solo_result.scalar() or 0

    squad_result = await db.execute(
        select(func.coalesce(func.avg(SessionParticipant.focus_score), 0))
        .join(FocusSession)
        .where(SessionParticipant.user_id == current_user.id)
        .where(
            select(func.count(SessionParticipant.id))
            .where(SessionParticipant.session_id == FocusSession.id)
            .correlate(FocusSession)
            .scalar_subquery() > 1
        )
    )
    squad_avg = squad_result.scalar() or 0

    uplift = round(squad_avg - solo_avg, 1) if solo_avg > 0 else 0

    daily_data = []
    for i in range(7):
        day = now - timedelta(days=6 - i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_result = await db.execute(
            select(
                func.coalesce(func.sum(SessionParticipant.total_focus_seconds), 0),
                func.coalesce(func.avg(SessionParticipant.focus_score), 0),
                func.count(SessionParticipant.id),
            )
            .where(SessionParticipant.user_id == current_user.id)
            .where(SessionParticipant.joined_at >= day_start)
            .where(SessionParticipant.joined_at < day_end)
        )
        day_focus, day_score, day_count = day_result.first()
        daily_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "focus_minutes": round(day_focus / 60, 1),
            "avg_score": round(day_score, 1),
            "sessions": day_count,
        })

    return {
        "total_sessions": total_sessions,
        "total_focus_hours": round(total_focus_secs / 3600, 1),
        "avg_focus_score": round(avg_score, 1),
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
        "week_sessions": week_sessions,
        "week_focus_hours": round(week_focus_secs / 3600, 1),
        "week_avg_score": round(week_avg_score, 1),
        "solo_vs_squad_uplift": uplift,
        "daily_data": daily_data,
    }


@router.get("/session-history")
async def get_session_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SessionParticipant)
        .where(SessionParticipant.user_id == current_user.id)
        .order_by(SessionParticipant.joined_at.desc())
        .limit(limit)
        .options(selectinload(SessionParticipant.session).selectinload(FocusSession.squad))
    )
    participations = result.scalars().all()

    history = []
    for p in participations:
        total = p.total_focus_seconds + p.total_distracted_seconds
        history.append({
            "session_id": p.session_id,
            "squad_name": p.session.squad.name if p.session and p.session.squad else "Unknown",
            "joined_at": p.joined_at.isoformat(),
            "duration_minutes": round(total / 60, 1),
            "focus_score": round(p.focus_score, 1),
            "nudges_received": p.nudges_received,
        })

    return history
