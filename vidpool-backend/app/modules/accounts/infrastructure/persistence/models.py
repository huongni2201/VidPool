from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.base import Base


class ProviderAccountModel(Base):
    __tablename__ = "provider_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_key: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_identity: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    profile_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_validated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_failure_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    lease: Mapped["AccountLeaseModel | None"] = relationship(
        "AccountLeaseModel",
        back_populates="account",
        cascade="all, delete-orphan",
        uselist=False,
    )

    __table_args__ = (
        Index("ix_provider_accounts_provider_status", "provider_key", "status"),
        Index("ix_provider_accounts_last_used_at", "last_used_at"),
        Index("ix_provider_accounts_cooldown_until", "cooldown_until"),
    )


class AccountLeaseModel(Base):
    __tablename__ = "account_leases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("provider_accounts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    account: Mapped[ProviderAccountModel] = relationship(
        "ProviderAccountModel",
        back_populates="lease",
    )

    __table_args__ = (Index("ix_account_leases_expires_at", "expires_at"),)
