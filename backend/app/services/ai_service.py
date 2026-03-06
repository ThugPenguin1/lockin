import httpx
import random
from app.core.config import settings

SYSTEM_PROMPT = """You are the AI coach inside LockIn, a social study app that uses on-device attention tracking to help students stay focused. You speak in a direct, warm, slightly competitive tone - like a smart study buddy who genuinely wants you to win. Keep responses concise (1-3 sentences max). Never use hashtags. Never be cringe. Be real."""


async def call_deepseek(messages: list[dict], temperature: float = 0.8, max_tokens: int = 120) -> str | None:
    if not settings.DEEPSEEK_API_KEY:
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stream": False,
                },
                timeout=15.0,
            )
            data = resp.json()
            if "error" in data:
                print(f"[AI] DeepSeek API error: {data['error']}")
                return None
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"].strip().strip('"')
            print(f"[AI] Unexpected DeepSeek response keys: {list(data.keys())}")
            return None
    except Exception as e:
        print(f"[AI] DeepSeek call failed: {e}")
        return None


async def generate_nudge(
    user_name: str,
    friends: list[str],
    user_score: float,
    friend_scores: list[float],
    minutes_focused: int,
    nudge_type: str,
) -> str:
    friends_str = ", ".join(friends[:3]) if friends else "Your squadmates"
    avg_friend = round(sum(friend_scores) / max(len(friend_scores), 1))

    style_hint = {
        "social": "Reference that their friends are still studying. Create light FOMO.",
        "competitive": "Use light competitive framing - mention leaderboard position or friend scores.",
        "supportive": "Be warm and encouraging. Acknowledge their effort. Motivate gently.",
    }.get(nudge_type, "Be encouraging.")

    prompt = f"""Generate a short focus nudge (max 15 words) for a student using LockIn.

Student: {user_name} | Focus score: {user_score:.0f}% | Studied: {minutes_focused}min
Friends studying right now: {friends_str} (avg score: {avg_friend}%)
Style: {nudge_type} - {style_hint}

Reply with ONLY the nudge text."""

    result = await call_deepseek([
        {"role": "system", "content": "You write ultra-short motivational study nudges for a focus app. Max 15 words. No quotes."},
        {"role": "user", "content": prompt},
    ], temperature=0.9, max_tokens=40)

    if result:
        return result

    fallbacks = {
        "social": [
            f"{friends_str} {'is' if len(friends) == 1 else 'are'} still locked in - don't fall behind!",
            f"Your squad is grinding. {friends_str} {'is' if len(friends) == 1 else 'are'} counting on you.",
            f"{friends_str} just passed the {minutes_focused}-minute mark too. Stay in sync!",
        ],
        "competitive": [
            f"Squad average is {avg_friend}% focus. You're at {user_score:.0f}%. Close the gap.",
            f"{friends_str} {'has' if len(friends) == 1 else 'have'} a higher score. Show them what you've got.",
            f"You're {minutes_focused} minutes in - push for a top-3 squad finish.",
        ],
        "supportive": [
            f"{minutes_focused} minutes of focused work so far. That's real progress. Keep building.",
            f"Great effort! Your consistency over {minutes_focused} minutes is building a strong session.",
            f"You're doing better than you think. {user_score:.0f}% focus is solid work.",
        ],
    }
    return random.choice(fallbacks.get(nudge_type, fallbacks["supportive"]))


_coach_call_count = 0

async def generate_coaching_message(
    user_name: str,
    focus_score: float,
    minutes_elapsed: int,
    friends: list[str],
    friend_scores: list[float],
    todos_completed: int,
    todos_total: int,
    recent_trend: str,
) -> dict:
    global _coach_call_count
    _coach_call_count += 1

    friends_str = ", ".join(friends[:3]) if friends else "no one else"
    avg_friend = round(sum(friend_scores) / max(len(friend_scores), 1)) if friend_scores else 0
    todo_str = f"{todos_completed}/{todos_total} tasks done" if todos_total > 0 else "no tasks set"

    prompt = f"""You are the AI coach in a live study session. Give a brief coaching insight (1-2 sentences).

Student: {user_name}
Current focus: {focus_score:.0f}% | Trend: {recent_trend} | Time: {minutes_elapsed}min
Friends studying: {friends_str} (avg focus: {avg_friend}%)
Tasks: {todo_str}

Based on this data, give a personalized coaching observation. Be specific about what you see in their numbers. Don't be generic."""

    result = await call_deepseek([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ], temperature=0.7, max_tokens=80)

    if result:
        return {"message": result, "type": "ai_generated"}

    msg = _smart_coaching_fallback(
        user_name, focus_score, minutes_elapsed, friends, friend_scores,
        avg_friend, todos_completed, todos_total, recent_trend, _coach_call_count,
    )
    return {"message": msg, "type": "ai_generated"}


def _smart_coaching_fallback(
    user_name: str, score: float, minutes: int, friends: list, friend_scores: list,
    avg_friend: float, todos_done: int, todos_total: int, trend: str, call_num: int,
) -> str:
    pool: list[str] = []

    if trend == "improving":
        pool.extend([
            f"Your focus is trending up - {score:.0f}% and climbing. Whatever you're doing, keep doing it.",
            f"I'm seeing an upward trajectory in your attention patterns. {score:.0f}% and rising over {minutes} minutes.",
            f"Nice recovery. Your focus jumped to {score:.0f}%. The data shows you're locking back in.",
        ])
    elif trend == "declining":
        pool.extend([
            f"Your focus curve is dipping - {score:.0f}% and falling. Consider a micro-break: 30 seconds, then restart.",
            f"Attention drift detected. You've dropped to {score:.0f}%. Close one tab and re-commit for 5 more minutes.",
        ])

    if friends and friend_scores:
        best_friend = friends[friend_scores.index(max(friend_scores))]
        best_score = max(friend_scores)
        if score < best_score:
            pool.append(f"{best_friend} is at {best_score:.0f}% right now. You're at {score:.0f}%. Time to close that gap.")
        else:
            pool.append(f"You're leading the squad at {score:.0f}%. {best_friend} is right behind at {best_score:.0f}%.")

        if avg_friend > 0:
            pool.append(f"Squad average is {avg_friend}% focus. You're {'above' if score > avg_friend else 'below'} the group at {score:.0f}%.")

    if todos_total > 0:
        if todos_done == 0:
            pool.append(f"You haven't checked off any tasks yet. Focus on completing just one - momentum builds momentum.")
        elif todos_done < todos_total:
            pool.append(f"{todos_done}/{todos_total} tasks done. You're making progress. Lock in on the next one.")
        else:
            pool.append(f"All {todos_total} tasks complete. Consider adding new goals or doing a deep review of your work.")

    if score >= 85:
        pool.extend([
            f"{score:.0f}% focus at {minutes} minutes - you're in deep work territory. This is where real learning happens.",
            f"Elite focus detected. {score:.0f}% over {minutes} minutes. Your attention patterns look like a top performer.",
            f"Your gaze stability and engagement metrics are strong. {score:.0f}% - keep riding this wave.",
        ])
    elif score >= 70:
        pool.extend([
            f"Holding at {score:.0f}% over {minutes} minutes. Consistent focus like this compounds. Keep it steady.",
            f"{minutes} minutes in at {score:.0f}% - you're building a solid session. Every minute adds up.",
            f"Your attention model shows sustained engagement at {score:.0f}%. Strong session so far.",
        ])
    elif score >= 50:
        pool.extend([
            f"{score:.0f}% focus - your attention is splitting. Try the Pomodoro technique: 5 more focused minutes, then a break.",
            f"Mild attention drift at {score:.0f}%. Quick fix: name one thing you'll accomplish in the next 3 minutes.",
        ])
    else:
        pool.extend([
            f"Focus at {score:.0f}% - looks like you're struggling. That's okay. Take 3 deep breaths and restart with one small task.",
            f"Your attention metrics dropped to {score:.0f}%. Step away for 60 seconds. Coming back fresh beats pushing through fog.",
        ])

    if minutes >= 45:
        pool.append(f"{minutes} minutes of sustained study - that's impressive stamina. Consider a 5-minute break soon to stay sharp.")
    elif minutes >= 20 and minutes < 25:
        pool.append(f"You've hit the 20-minute mark - the point where most students lose focus. Push through and you'll outlast 80% of people.")
    elif minutes <= 5:
        pool.append(f"Just getting started. The first 10 minutes are the hardest. Build momentum by starting with your easiest task.")

    return pool[call_num % len(pool)] if pool else f"{score:.0f}% focus over {minutes} minutes. Stay locked in."


async def generate_session_summary(
    user_name: str,
    focus_score: float,
    total_minutes: int,
    focus_minutes: int,
    ranking: int,
    squad_size: int,
    nudges_received: int,
    friends: list[str],
    friend_scores: list[float],
) -> str:
    friends_data = ", ".join(
        f"{name} ({score:.0f}%)" for name, score in zip(friends, friend_scores)
    ) if friends else "solo session"

    prompt = f"""Write a brief AI-generated session recap (2-3 sentences) for a study session that just ended.

Student: {user_name}
Focus score: {focus_score:.0f}% | Duration: {total_minutes}min ({focus_minutes}min focused)
Squad ranking: #{ranking} of {squad_size} | Nudges received: {nudges_received}
Squad performance: {friends_data}

Analyze patterns. Be specific about what went well and one thing to improve. Reference actual numbers."""

    result = await call_deepseek([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ], temperature=0.6, max_tokens=120)

    if result:
        return result

    if ranking == 1:
        return f"You topped the squad with {focus_score:.0f}% focus across {total_minutes} minutes. {focus_minutes} of those were pure focus time. Keep leading."
    elif focus_score >= 75:
        return f"Strong {focus_score:.0f}% session over {total_minutes} minutes. You maintained focus for {focus_minutes} minutes - that's solid consistency. Try to reduce drift windows next time."
    else:
        return f"You pushed through {total_minutes} minutes with {focus_score:.0f}% focus. Consider shorter, more intense sessions to build stamina."
