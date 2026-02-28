import random
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.session import SessionParticipant, Nudge, FocusSession
from app.models.user import User
from app.core.config import settings

NUDGE_COOLDOWN_SECONDS = 120

FALLBACK_TEMPLATES = {
    "social": [
        "{friends} {verb} still locked in — don't fall behind!",
        "Your squad is grinding right now. {friends} {verb} counting on you!",
        "{friends} just hit a new milestone. Keep up the momentum!",
    ],
    "competitive": [
        "You're currently #{rank} in your squad. Push for the top!",
        "{friends} {has} a higher focus score right now. You got this!",
        "The squad average is {avg_score}% focus. Can you beat it?",
    ],
    "supportive": [
        "You've been focused for {minutes} minutes already — incredible! Just a bit more.",
        "Everyone drifts sometimes. Take a breath and lock back in. 💪",
        "You're doing great! {minutes} minutes of focus today. Keep building that streak!",
    ],
}


class NudgeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def maybe_generate_nudge(
        self,
        participant: SessionParticipant,
        session_id: int,
        user: User,
    ) -> dict | None:
        last_nudge = await self.db.execute(
            select(Nudge)
            .where(Nudge.participant_id == participant.id)
            .order_by(Nudge.timestamp.desc())
            .limit(1)
        )
        recent = last_nudge.scalar_one_or_none()
        if recent and (datetime.now(timezone.utc) - recent.timestamp.replace(tzinfo=timezone.utc)) < timedelta(seconds=NUDGE_COOLDOWN_SECONDS):
            return None

        session_result = await self.db.execute(
            select(FocusSession)
            .where(FocusSession.id == session_id)
        )
        session = session_result.scalar_one()

        active_result = await self.db.execute(
            select(SessionParticipant)
            .where(
                SessionParticipant.session_id == session_id,
                SessionParticipant.is_active == True,
                SessionParticipant.user_id != user.id,
            )
        )
        active_others = active_result.scalars().all()

        friend_names = []
        friend_scores = []
        for other in active_others:
            u_result = await self.db.execute(select(User).where(User.id == other.user_id))
            u = u_result.scalar_one()
            friend_names.append(u.display_name)
            friend_scores.append(other.focus_score)

        nudge_type = self._pick_nudge_type(participant, friend_scores)

        context = {
            "user_name": user.display_name,
            "friends": friend_names,
            "friend_scores": friend_scores,
            "user_score": participant.focus_score,
            "minutes_focused": round(participant.total_focus_seconds / 60),
            "nudge_type": nudge_type,
        }

        message = await self._generate_message(context, nudge_type)

        nudge = Nudge(
            participant_id=participant.id,
            nudge_type=nudge_type,
            message=message,
            attention_score_at_trigger=participant.focus_score,
        )
        self.db.add(nudge)
        participant.nudges_received += 1
        await self.db.flush()

        return {
            "id": nudge.id,
            "message": message,
            "nudge_type": nudge_type,
            "timestamp": nudge.timestamp.isoformat() if nudge.timestamp else datetime.now(timezone.utc).isoformat(),
        }

    def _pick_nudge_type(self, participant: SessionParticipant, friend_scores: list) -> str:
        if friend_scores and participant.focus_score < min(friend_scores, default=100):
            return "competitive"
        elif participant.total_focus_seconds > 1800:
            return "supportive"
        else:
            return "social"

    async def _generate_message(self, context: dict, nudge_type: str) -> str:
        if settings.MINIMAX_API_KEY:
            try:
                return await self._call_minimax(context, nudge_type)
            except Exception:
                pass

        return self._fallback_message(context, nudge_type)

    async def _call_minimax(self, context: dict, nudge_type: str) -> str:
        friends_str = ", ".join(context["friends"][:3]) if context["friends"] else "Your squadmates"
        prompt = f"""You are a focus accountability buddy in a study app called LockIn. 
Generate a short, punchy nudge message (max 15 words) to help a student refocus.

Context:
- Student name: {context['user_name']}
- Friends currently studying: {friends_str}
- Student's current focus score: {context['user_score']:.0f}%
- Minutes studied so far: {context['minutes_focused']}
- Nudge style: {nudge_type} ({'mention friends are still going' if nudge_type == 'social' else 'light competitive framing' if nudge_type == 'competitive' else 'encouraging and warm'})

Respond with ONLY the nudge message, no quotes or explanation."""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.MINIMAX_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-Text-01",
                    "messages": [
                        {"role": "system", "content": "You generate short motivational study nudges."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 50,
                    "temperature": 0.8,
                },
                timeout=10.0,
            )
            data = response.json()
            return data["choices"][0]["message"]["content"].strip().strip('"')

    def _fallback_message(self, context: dict, nudge_type: str) -> str:
        templates = FALLBACK_TEMPLATES[nudge_type]
        template = random.choice(templates)

        friends = context["friends"]
        if len(friends) == 0:
            friends_str = "Your squadmates"
            verb = "are"
            has = "have"
        elif len(friends) == 1:
            friends_str = friends[0]
            verb = "is"
            has = "has"
        else:
            friends_str = f"{', '.join(friends[:-1])} and {friends[-1]}"
            verb = "are"
            has = "have"

        avg_score = round(sum(context["friend_scores"]) / max(len(context["friend_scores"]), 1))
        rank_scores = sorted(context["friend_scores"] + [context["user_score"]], reverse=True)
        rank = rank_scores.index(context["user_score"]) + 1

        return template.format(
            friends=friends_str,
            verb=verb,
            has=has,
            rank=rank,
            avg_score=avg_score,
            minutes=context["minutes_focused"],
        )
