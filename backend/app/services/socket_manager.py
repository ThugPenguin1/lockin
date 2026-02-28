from datetime import datetime, timezone

connected_users: dict[str, dict] = {}
user_sessions: dict[int, str] = {}


def register_events(sio):
    @sio.event
    async def connect(sid, environ, auth):
        print(f"[WS] Client connected: {sid}")

    @sio.event
    async def disconnect(sid):
        user_info = connected_users.pop(sid, None)
        if user_info:
            user_id = user_info["user_id"]
            user_sessions.pop(user_id, None)
            for squad_id in user_info.get("squad_ids", []):
                await sio.emit("member_offline", {
                    "user_id": user_id,
                    "username": user_info["username"],
                }, room=f"squad_{squad_id}")
        print(f"[WS] Client disconnected: {sid}")

    @sio.event
    async def register(sid, data):
        user_id = data["user_id"]
        username = data.get("username", "")
        display_name = data.get("display_name", "")
        squad_ids = data.get("squad_ids", [])

        connected_users[sid] = {
            "user_id": user_id,
            "username": username,
            "display_name": display_name,
            "squad_ids": squad_ids,
        }
        user_sessions[user_id] = sid

        for squad_id in squad_ids:
            await sio.enter_room(sid, f"squad_{squad_id}")
            await sio.emit("member_online", {
                "user_id": user_id,
                "username": username,
                "display_name": display_name,
            }, room=f"squad_{squad_id}")

    @sio.event
    async def join_focus_session(sid, data):
        session_id = data["session_id"]
        squad_id = data["squad_id"]
        user_info = connected_users.get(sid, {})

        await sio.enter_room(sid, f"session_{session_id}")

        await sio.emit("participant_joined", {
            "user_id": user_info.get("user_id"),
            "display_name": user_info.get("display_name"),
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }, room=f"squad_{squad_id}")

    @sio.event
    async def leave_focus_session(sid, data):
        session_id = data["session_id"]
        squad_id = data["squad_id"]
        user_info = connected_users.get(sid, {})

        await sio.leave_room(sid, f"session_{session_id}")

        await sio.emit("participant_left", {
            "user_id": user_info.get("user_id"),
            "display_name": user_info.get("display_name"),
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }, room=f"squad_{squad_id}")

    @sio.event
    async def attention_update(sid, data):
        session_id = data["session_id"]
        user_info = connected_users.get(sid, {})

        await sio.emit("focus_update", {
            "user_id": user_info.get("user_id"),
            "focus_score": data["focus_score"],
            "is_focused": data["is_focused"],
            "status_label": data.get("status_label", "Focused"),
            "total_focus_seconds": data.get("total_focus_seconds", 0),
        }, room=f"session_{session_id}", skip_sid=sid)

    @sio.event
    async def send_nudge(sid, data):
        target_user_id = data["target_user_id"]
        target_sid = user_sessions.get(target_user_id)

        if target_sid:
            await sio.emit("nudge_received", {
                "message": data["message"],
                "nudge_type": data["nudge_type"],
                "from_user": data.get("from_user", "System"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, room=target_sid)

    @sio.event
    async def session_started(sid, data):
        squad_id = data["squad_id"]
        user_info = connected_users.get(sid, {})

        await sio.emit("new_session", {
            "session_id": data["session_id"],
            "started_by": user_info.get("display_name"),
            "squad_id": squad_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }, room=f"squad_{squad_id}")
