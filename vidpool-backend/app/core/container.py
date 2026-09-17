from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import scoped_session, sessionmaker

from app.core.config import AppConfig
from app.infrastructure.persistence.database import create_engine_for_path
from app.infrastructure.persistence.paths import get_data_dir, get_database_path
from app.modules.accounts.application.ports import (
    AccountRepositoryPort,
    ProviderRegistryPort,
)
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.infrastructure.browser.playwright_session import (
    PlaywrightBrowserSessionManager,
)
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)
from app.modules.accounts.infrastructure.persistence.repository import (
    SQLAlchemyAccountRepository,
)
from app.modules.accounts.infrastructure.providers.registry import ProviderRegistry


@dataclass
class AppContainer:
    account_service: AccountService
    browser_session_manager: PlaywrightBrowserSessionManager
    engine: Engine | None = None
    provider_registry: ProviderRegistryPort | None = None


def build_container(
    config: AppConfig | None = None,
    account_repository: AccountRepositoryPort | None = None,
    browser_session_manager: PlaywrightBrowserSessionManager | None = None,
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

    if browser_session_manager is None:
        resolver = BrowserProfilePathResolver(get_data_dir())
        browser_mgr = PlaywrightBrowserSessionManager(resolver=resolver)
    else:
        browser_mgr = browser_session_manager

    providers = provider_registry if provider_registry is not None else ProviderRegistry()

    account_service = AccountService(
        accounts=account_repo,
        browser=browser_mgr,
        providers=providers,
    )

    return AppContainer(
        account_service=account_service,
        browser_session_manager=browser_mgr,
        engine=engine,
        provider_registry=providers,
    )
