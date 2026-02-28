from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    squad_id = Column(Integer, ForeignKey("squads.id"), nullable=False)
    started_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    session_type = Column(String(20), default="open")  # open, timed, pomodoro

    squad = relationship("Squad", back_populates="sessions", lazy="selectin")
    starter = relationship("User", foreign_keys=[started_by], lazy="selectin")
    participants = relationship("SessionParticipant", back_populates="session", lazy="selectin")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("focus_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    focus_score = Column(Float, default=100.0)
    total_focus_seconds = Column(Integer, default=0)
    total_distracted_seconds = Column(Integer, default=0)
    nudges_received = Column(Integer, default=0)
    nudges_responded = Column(Integer, default=0)

    session = relationship("FocusSession", back_populates="participants")
    user = relationship("User", back_populates="participations")
    attention_logs = relationship("AttentionLog", back_populates="participant", lazy="selectin")
    nudge_logs = relationship("Nudge", back_populates="participant", lazy="selectin")


class AttentionLog(Base):
    __tablename__ = "attention_logs"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    attention_score = Column(Float, nullable=False)  # 0.0 to 1.0
    is_focused = Column(Boolean, nullable=False)
    gaze_x = Column(Float, nullable=True)
    gaze_y = Column(Float, nullable=True)
    head_pitch = Column(Float, nullable=True)
    head_yaw = Column(Float, nullable=True)

    participant = relationship("SessionParticipant", back_populates="attention_logs")


class Nudge(Base):
    __tablename__ = "nudges"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    nudge_type = Column(String(20), nullable=False)  # social, competitive, supportive
    message = Column(Text, nullable=False)
    attention_score_at_trigger = Column(Float, nullable=False)
    was_effective = Column(Boolean, nullable=True)  # did focus improve within 60s?
    response_time_seconds = Column(Integer, nullable=True)

    participant = relationship("SessionParticipant", back_populates="nudge_logs")
