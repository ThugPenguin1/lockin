from sqlalchemy import Column, Integer, String, DateTime, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

friendship = Table(
    "friendships",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("friend_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    current_session_id = Column(Integer, ForeignKey("focus_sessions.id"), nullable=True)
    total_focus_minutes = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    friends = relationship(
        "User",
        secondary=friendship,
        primaryjoin=id == friendship.c.user_id,
        secondaryjoin=id == friendship.c.friend_id,
        lazy="selectin",
    )

    squads = relationship("Squad", secondary="squad_members", back_populates="members", lazy="selectin")
    participations = relationship("SessionParticipant", back_populates="user", lazy="selectin")
