from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.squad import Squad, squad_members
from app.models.session import FocusSession, SessionParticipant, AttentionLog, Nudge
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    ParticipantResponse,
    AttentionUpdate,
    SessionSummary,
    ParticipantStatus,
)
from app.schemas.user import UserPublic
from app.services.nudge_service import NudgeService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    membership = await db.execute(
        select(squad_members).where(
            squad_members.c.squad_id == session_data.squad_id,
            squad_members.c.user_id == current_user.id,
        )
    )
    if not membership.first():
        raise HTTPException(status_code=403, detail="Not a member of this squad")

    session = FocusSession(
        squad_id=session_data.squad_id,
        started_by=current_user.id,
        session_type=session_data.session_type,
    )
    db.add(session)
    await db.flush()

    participant = SessionParticipant(
        session_id=session.id,
        user_id=current_user.id,
    )
    db.add(participant)

    current_user.current_session_id = session.id
    current_user.is_online = True
    await db.flush()
    await db.refresh(session, ["participants"])

    return await _session_to_response(session, db)


@router.post("/{session_id}/join", response_model=ParticipantResponse)
async def join_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FocusSession).where(FocusSession.id == session_id, FocusSession.is_active == True)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    existing = await db.execute(
        select(SessionParticipant).where(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already in this session")

    participant = SessionParticipant(
        session_id=session_id,
        user_id=current_user.id,
    )
    db.add(participant)

    current_user.current_session_id = session_id
    current_user.is_online = True
    await db.flush()
    await db.refresh(participant)

    return ParticipantResponse.model_validate(participant)


@router.post("/{session_id}/leave", response_model=ParticipantResponse)
async def leave_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SessionParticipant).where(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.is_active == True,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Not in this session")

    now = datetime.now(timezone.utc)
    participant.is_active = False
    participant.left_at = now

    # Compute actual elapsed time from join to leave
    joined = participant.joined_at.replace(tzinfo=timezone.utc) if participant.joined_at.tzinfo is None else participant.joined_at
    actual_seconds = int((now - joined).total_seconds())

    # If attention tracking didn't accumulate enough data, fill in the gap
    tracked_seconds = participant.total_focus_seconds + participant.total_distracted_seconds
    if actual_seconds > tracked_seconds:
        gap = actual_seconds - tracked_seconds
        # Attribute untracked time proportionally based on existing focus ratio
        if tracked_seconds > 0:
            focus_ratio = participant.total_focus_seconds / tracked_seconds
        else:
            focus_ratio = 1.0  # assume focused if no tracking data
        participant.total_focus_seconds += int(gap * focus_ratio)
        participant.total_distracted_seconds += gap - int(gap * focus_ratio)

    total = participant.total_focus_seconds + participant.total_distracted_seconds
    participant.focus_score = (participant.total_focus_seconds / max(total, 1)) * 100

    # Update user stats
    current_user.current_session_id = None
    current_user.total_focus_minutes += participant.total_focus_seconds // 60

    # Update streak
    await _update_streak(current_user, db)

    await db.flush()
    await db.refresh(participant)

    active_result = await db.execute(
        select(func.count(SessionParticipant.id)).where(
            SessionParticipant.session_id == session_id,
            SessionParticipant.is_active == True,
        )
    )
    if active_result.scalar() == 0:
        session_result = await db.execute(
            select(FocusSession).where(FocusSession.id == session_id)
        )
        session = session_result.scalar_one()
        session.is_active = False
        session.ended_at = now

    return ParticipantResponse.model_validate(participant)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FocusSession)
        .where(FocusSession.id == session_id)
        .options(selectinload(FocusSession.participants).selectinload(SessionParticipant.user))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return await _session_to_response(session, db)


@router.get("/squad/{squad_id}/active", response_model=List[SessionResponse])
async def get_active_sessions(
    squad_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FocusSession)
        .where(FocusSession.squad_id == squad_id, FocusSession.is_active == True)
        .options(selectinload(FocusSession.participants).selectinload(SessionParticipant.user))
    )
    sessions = result.scalars().unique().all()
    return [await _session_to_response(s, db) for s in sessions]


@router.post("/attention", status_code=status.HTTP_200_OK)
async def update_attention(
    data: AttentionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SessionParticipant).where(
            SessionParticipant.session_id == data.session_id,
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.is_active == True,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Not in this session")

    log = AttentionLog(
        participant_id=participant.id,
        attention_score=data.attention_score,
        is_focused=data.is_focused,
        gaze_x=data.gaze_x,
        gaze_y=data.gaze_y,
        head_pitch=data.head_pitch,
        head_yaw=data.head_yaw,
    )
    db.add(log)

    if data.is_focused:
        participant.total_focus_seconds += 5
    else:
        participant.total_distracted_seconds += 5

    total = participant.total_focus_seconds + participant.total_distracted_seconds
    participant.focus_score = (participant.total_focus_seconds / max(total, 1)) * 100

    nudge_response = None
    if not data.is_focused and data.attention_score < 0.4:
        nudge_service = NudgeService(db)
        nudge_response = await nudge_service.maybe_generate_nudge(participant, data.session_id, current_user)

    await db.flush()

    return {
        "focus_score": participant.focus_score,
        "nudge": nudge_response,
    }


@router.get("/{session_id}/summary", response_model=SessionSummary)
async def get_session_summary(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FocusSession)
        .where(FocusSession.id == session_id)
        .options(
            selectinload(FocusSession.participants).selectinload(SessionParticipant.user),
            selectinload(FocusSession.participants).selectinload(SessionParticipant.nudge_logs),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    my_participant = None
    participants_summary = []
    for p in sorted(session.participants, key=lambda x: x.focus_score, reverse=True):
        total_seconds = p.total_focus_seconds + p.total_distracted_seconds
        entry = {
            "user_id": p.user_id,
            "display_name": p.user.display_name,
            "focus_score": round(p.focus_score, 1),
            "total_minutes": round(total_seconds / 60, 1),
            "nudges_received": p.nudges_received,
        }
        participants_summary.append(entry)
        if p.user_id == current_user.id:
            my_participant = p

    if not my_participant:
        raise HTTPException(status_code=403, detail="Not a participant of this session")

    total_seconds = my_participant.total_focus_seconds + my_participant.total_distracted_seconds
    ranking = next(
        (i + 1 for i, p in enumerate(
            sorted(session.participants, key=lambda x: x.focus_score, reverse=True)
        ) if p.user_id == current_user.id),
        len(session.participants),
    )

    prev_best = await db.execute(
        select(func.max(SessionParticipant.focus_score)).where(
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.id != my_participant.id,
        )
    )
    best_score = prev_best.scalar() or 0

    active_friends = [
        p.user.display_name for p in session.participants
        if p.user_id != current_user.id
    ]
    insight = _generate_local_insight(my_participant, active_friends, ranking, len(session.participants))

    return SessionSummary(
        session_id=session_id,
        total_duration_minutes=round(total_seconds / 60, 1),
        focus_score=round(my_participant.focus_score, 1),
        total_focus_minutes=round(my_participant.total_focus_seconds / 60, 1),
        total_distracted_minutes=round(my_participant.total_distracted_seconds / 60, 1),
        nudges_received=my_participant.nudges_received,
        nudges_responded=my_participant.nudges_responded,
        squad_ranking=ranking,
        squad_size=len(session.participants),
        streak_count=current_user.current_streak,
        is_personal_best=my_participant.focus_score > best_score,
        ai_insight=insight,
        participants_summary=participants_summary,
    )


def _generate_local_insight(participant, friends: list, ranking: int, total: int) -> str:
    score = participant.focus_score
    minutes = round((participant.total_focus_seconds + participant.total_distracted_seconds) / 60, 1)

    if ranking == 1:
        return f"You topped the squad with a {score:.0f}% focus score across {minutes} minutes. Keep leading the charge!"
    elif score >= 80:
        friends_str = " and ".join(friends[:2]) if friends else "your squad"
        return f"Strong session! You maintained {score:.0f}% focus for {minutes} minutes. You focus better when studying with {friends_str}."
    elif score >= 60:
        return f"Solid effort — {score:.0f}% focus over {minutes} minutes. Try starting sessions earlier in the day for even better results."
    else:
        return f"You stayed for {minutes} minutes — that's commitment! Consider shorter, more intense sessions to build your focus stamina."


async def _update_streak(user: User, db: AsyncSession):
    """Increment streak if user hasn't studied today, otherwise keep it."""
    today = datetime.now(timezone.utc).date()
    yesterday = today - __import__("datetime").timedelta(days=1)

    # Check if user already has a session today (besides this one)
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.count(SessionParticipant.id))
        .where(
            SessionParticipant.user_id == user.id,
            SessionParticipant.joined_at >= today_start,
            SessionParticipant.is_active == False,
        )
    )
    sessions_today = result.scalar() or 0

    if sessions_today <= 1:
        # This is the first completed session today
        yesterday_start = datetime.combine(yesterday, datetime.min.time()).replace(tzinfo=timezone.utc)
        yesterday_end = today_start
        yesterday_result = await db.execute(
            select(func.count(SessionParticipant.id))
            .where(
                SessionParticipant.user_id == user.id,
                SessionParticipant.joined_at >= yesterday_start,
                SessionParticipant.joined_at < yesterday_end,
                SessionParticipant.is_active == False,
            )
        )
        had_session_yesterday = (yesterday_result.scalar() or 0) > 0

        if had_session_yesterday:
            user.current_streak += 1
        else:
            user.current_streak = 1

        if user.current_streak > user.longest_streak:
            user.longest_streak = user.current_streak


async def _session_to_response(session: FocusSession, db: AsyncSession) -> SessionResponse:
    participants = []
    for p in session.participants:
        user_data = p.user if hasattr(p, "user") and p.user else None
        if not user_data:
            user_result = await db.execute(select(User).where(User.id == p.user_id))
            user_data = user_result.scalar_one()

        total_secs = p.total_focus_seconds + p.total_distracted_seconds
        if p.focus_score >= 90:
            label = "On fire"
        elif p.focus_score >= 70:
            label = "Focused"
        elif p.focus_score >= 50:
            label = "Drifting"
        else:
            label = "Distracted"

        participants.append(ParticipantStatus(
            user=UserPublic.model_validate(user_data),
            focus_score=round(p.focus_score, 1),
            total_focus_seconds=p.total_focus_seconds,
            is_active=p.is_active,
            joined_at=p.joined_at,
            status_label=label,
        ))

    return SessionResponse(
        id=session.id,
        squad_id=session.squad_id,
        started_by=session.started_by,
        started_at=session.started_at,
        ended_at=session.ended_at,
        is_active=session.is_active,
        session_type=session.session_type,
        participants=participants,
    )
