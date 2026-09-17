from app.modules.accounts.domain.account import ProviderAccount

from .queries import AccountView


def account_to_view(account: ProviderAccount) -> AccountView:
    return AccountView(
        id=account.id,
        provider_key=account.provider_key,
        display_name=account.display_name,
        external_identity=account.external_identity,
        status=account.status,
        last_used_at=account.last_used_at,
        last_validated_at=account.last_validated_at,
        cooldown_until=account.cooldown_until,
    )
