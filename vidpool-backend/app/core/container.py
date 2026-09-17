from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import scoped_session, sessionmaker

from app.core.config import AppConfig
from app.infrastructure.persistence.database import create_engine_for_path
from app.infrastructure.persistence.paths import get_data_dir, get_database_path
from app.modules.accounts.application.ports import (
    AccountRepositoryPort,
    BrowserSessionPort,
    ProviderRegistryPort,
)
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.browser.runtime import BrowserRuntime
from app.modules.accounts.infrastructure.persistence.repository import (
    SQLAlchemyAccountRepository,
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
    browser_runtime: BrowserRuntime | BrowserSessionPort | None = None,
    provider_registry: ProviderRegistryPort | None = None,
) -> AppContainer:
    del config  # May be used for provider API keys/environment configs in future

    engine = None
    if account_repository is None:
        engine = create_engine_for_path(get_database_path())
        session_factory = scoped_session(sessionmaker(bind=engine, expire_on_commit=False))
        account_repo: AccountRepositoryPort = SQLAlchemyAccountRepository(session_factory)
    else:
        account_repo = account_repository

    if browser_runtime is None:
        resolver = BrowserProfilePathResolver(get_data_dir())
        runtime = BrowserRuntime(resolver=resolver)
    else:
        runtime = browser_runtime

    providers = provider_registry if provider_registry is not None else ProviderRegistry()

    account_service = AccountService(
        accounts=account_repo,
        browser=runtime,
        providers=providers,
    )

    return AppContainer(
        account_service=account_service,
        browser_runtime=runtime,
        engine=engine,
        provider_registry=providers,
    )
