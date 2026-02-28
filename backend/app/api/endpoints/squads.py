import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.squad import Squad, squad_members
from app.models.session import FocusSession
from app.schemas.squad import SquadCreate, SquadResponse, SquadJoin
from app.schemas.user import UserPublic

router = APIRouter(prefix="/squads", tags=["squads"])


def generate_invite_code() -> str:
    return secrets.token_urlsafe(8)[:8].upper()


@router.post("/", response_model=SquadResponse, status_code=status.HTTP_201_CREATED)
async def create_squad(
    squad_data: SquadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    squad = Squad(
        name=squad_data.name,
        description=squad_data.description,
        avatar_emoji=squad_data.avatar_emoji,
        owner_id=current_user.id,
        invite_code=generate_invite_code(),
    )
    db.add(squad)
    await db.flush()

    await db.execute(squad_members.insert().values(squad_id=squad.id, user_id=current_user.id))
    await db.flush()
    await db.refresh(squad, ["members"])

    return _squad_to_response(squad)


@router.get("/", response_model=List[SquadResponse])
async def get_my_squads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Squad)
        .join(squad_members)
        .where(squad_members.c.user_id == current_user.id)
        .options(selectinload(Squad.members))
    )
    squads = result.scalars().unique().all()

    responses = []
    for squad in squads:
        active_count = await db.execute(
            select(func.count(FocusSession.id))
            .where(FocusSession.squad_id == squad.id, FocusSession.is_active == True)
        )
        resp = _squad_to_response(squad)
        resp.active_session_count = active_count.scalar() or 0
        responses.append(resp)

    return responses


@router.post("/join", response_model=SquadResponse)
async def join_squad(
    join_data: SquadJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Squad).where(Squad.invite_code == join_data.invite_code).options(selectinload(Squad.members))
    )
    squad = result.scalar_one_or_none()
    if not squad:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    if any(m.id == current_user.id for m in squad.members):
        raise HTTPException(status_code=400, detail="Already a member of this squad")

    await db.execute(squad_members.insert().values(squad_id=squad.id, user_id=current_user.id))
    await db.flush()
    await db.refresh(squad, ["members"])

    return _squad_to_response(squad)


@router.get("/{squad_id}", response_model=SquadResponse)
async def get_squad(
    squad_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Squad).where(Squad.id == squad_id).options(selectinload(Squad.members))
    )
    squad = result.scalar_one_or_none()
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")

    if not any(m.id == current_user.id for m in squad.members):
        raise HTTPException(status_code=403, detail="Not a member of this squad")

    return _squad_to_response(squad)


@router.get("/{squad_id}/members", response_model=List[UserPublic])
async def get_squad_members(
    squad_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Squad).where(Squad.id == squad_id).options(selectinload(Squad.members))
    )
    squad = result.scalar_one_or_none()
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")

    return [UserPublic.model_validate(m) for m in squad.members]


def _squad_to_response(squad: Squad) -> SquadResponse:
    return SquadResponse(
        id=squad.id,
        name=squad.name,
        invite_code=squad.invite_code,
        owner_id=squad.owner_id,
        description=squad.description,
        avatar_emoji=squad.avatar_emoji,
        created_at=squad.created_at,
        members=[UserPublic.model_validate(m) for m in squad.members],
    )
