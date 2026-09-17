from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProviderResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key: str
    display_name: str = Field(..., alias="displayName")
    auth_kind: str = Field(..., alias="authKind")


class AccountResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    provider_key: str = Field(..., alias="providerKey")
    display_name: str | None = Field(default=None, alias="displayName")
    external_identity: str | None = Field(default=None, alias="externalIdentity")
    status: str
    last_used_at: datetime | None = Field(default=None, alias="lastUsedAt")
    last_validated_at: datetime | None = Field(default=None, alias="lastValidatedAt")
    cooldown_until: datetime | None = Field(default=None, alias="cooldownUntil")


class StartLoginResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    account_id: str = Field(..., alias="accountId")
    status: str = Field(default="waiting_for_user")
