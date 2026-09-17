from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker

from app.core.config import AppConfig
from app.infrastructure.persistence.database import create_engine_for_path
from app.infrastructure.persistence.paths import get_data_dir, get_database_path
from app.modules.accounts.application.ports import (
    AccountRepositoryPort,
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
    account_repository: AccountRepositoryPort | None = None,
    uow_factory: Callable[[], AccountUnitOfWorkPort] | None = None,
    browser_runtime: BrowserRuntime | BrowserSessionPort | None = None,
    browser_session_manager: BrowserSessionPort | None = None,
    provider_registry: ProviderRegistryPort | None = None,
) -> AppContainer:
    del config  # May be used for provider API keys/environment configs in future

    engine = None
    if uow_factory is not None:
        resolved_uow_factory = uow_factory
    elif account_repository is not None:
        resolved_uow_factory = None
    else:
        engine = create_engine_for_path(get_database_path())
        session_factory = sessionmaker(bind=engine, expire_on_commit=False)
        resolved_uow_factory = lambda: SQLAlchemyAccountUnitOfWork(session_factory)

    runtime_candidate = browser_runtime or browser_session_manager
    if runtime_candidate is None:
        resolver = BrowserProfilePathResolver(get_data_dir())
        runtime = BrowserRuntime(resolver=resolver)
    else:
        runtime = runtime_candidate

    providers = provider_registry if provider_registry is not None else ProviderRegistry()

    if resolved_uow_factory is not None:
        account_service = AccountService(
            uow_factory=resolved_uow_factory,
            browser=runtime,
            providers=providers,
        )
    else:
        account_service = AccountService(
            accounts=account_repository,
            browser=runtime,
            providers=providers,
        )

    return AppContainer(
        account_service=account_service,
        browser_runtime=runtime,
        engine=engine,
        provider_registry=providers,
    )
