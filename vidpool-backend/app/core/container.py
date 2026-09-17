from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker

from app.core.config import AppConfig
from app.infrastructure.persistence.database import create_engine_for_path
from app.infrastructure.persistence.paths import get_data_dir, get_database_path
from app.modules.accounts.application.ports import (
    BrowserSessionPort,
    ProviderRegistryPort,
)
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.application.uow import AccountUnitOfWorkPort
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime
from app.modules.accounts.infrastructure.persistence.uow import (
    SQLAlchemyAccountUnitOfWork,
)
from app.modules.accounts.infrastructure.providers.browser_auth_base import (
    BrowserAutomationRuntime,
)
from app.modules.accounts.infrastructure.providers.dreamina import (
    DreaminaAuthAdapter,
)
from app.modules.accounts.infrastructure.providers.registry import ProviderRegistry


@dataclass
class AppContainer:
    account_service: AccountService
    browser_runtime: BrowserRuntime | BrowserSessionPort
    engine: Engine | None = None
    provider_registry: ProviderRegistryPort | None = None

    def close(self) -> None:
        self.browser_runtime.close_all()
        if self.engine is not None:
            self.engine.dispose()


def build_container(
    config: AppConfig | None = None,
    uow_factory: Callable[[], AccountUnitOfWorkPort] | None = None,
    browser_runtime: BrowserRuntime | BrowserSessionPort | None = None,
    provider_registry: ProviderRegistryPort | None = None,
) -> AppContainer:
    del config  # May be used for provider API keys/environment configs in future

    engine = None
    if uow_factory is not None:
        resolved_uow_factory = uow_factory
    else:
        engine = create_engine_for_path(get_database_path())
        session_factory = sessionmaker(bind=engine, expire_on_commit=False)

        def default_uow_factory() -> SQLAlchemyAccountUnitOfWork:
            return SQLAlchemyAccountUnitOfWork(session_factory)

        resolved_uow_factory = default_uow_factory

    if browser_runtime is None:
        resolver = BrowserProfilePathResolver(get_data_dir())
        runtime = BrowserRuntime(resolver=resolver)
    else:
        runtime = browser_runtime

    if provider_registry is not None:
        providers = provider_registry
    else:
        if not isinstance(runtime, BrowserAutomationRuntime):
            raise TypeError("Default provider registry requires a BrowserAutomationRuntime")
        providers = ProviderRegistry(
            auth_adapters=[
                DreaminaAuthAdapter(runtime),
            ]
        )

    account_service = AccountService(
        uow_factory=resolved_uow_factory,
        browser=runtime,
        providers=providers,
    )

    return AppContainer(
        account_service=account_service,
        browser_runtime=runtime,
        engine=engine,
        provider_registry=providers,
    )
