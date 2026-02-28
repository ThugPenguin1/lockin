from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

squad_members = Table(
    "squad_members",
    Base.metadata,
    Column("squad_id", Integer, ForeignKey("squads.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("joined_at", DateTime(timezone=True), server_default=func.now()),
)


class Squad(Base):
    __tablename__ = "squads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    invite_code = Column(String(20), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(String(500), default="")
    avatar_emoji = Column(String(10), default="📚")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", foreign_keys=[owner_id], lazy="selectin")
    members = relationship("User", secondary=squad_members, back_populates="squads", lazy="selectin")
    sessions = relationship("FocusSession", back_populates="squad", lazy="selectin")
