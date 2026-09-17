from collections.abc import Callable
from typing import Self

from sqlalchemy.orm import Session

from app.modules.accounts.application.ports import AccountRepositoryPort
from app.modules.accounts.application.uow import AccountUnitOfWorkPort
from app.modules.accounts.infrastructure.persistence.repository import (
    SQLAlchemyAccountRepository,
)


class SQLAlchemyAccountUnitOfWork(AccountUnitOfWorkPort):
    def __init__(
        self,
        session_factory: Callable[[], Session],
    ) -> None:
        self._session_factory = session_factory
        self.session: Session | None = None
        self._accounts: SQLAlchemyAccountRepository | None = None

    @property
    def accounts(self) -> AccountRepositoryPort:
        if self._accounts is None:
            raise RuntimeError("Unit of work has not been entered")
        return self._accounts

    def __enter__(self) -> Self:
        self.session = self._session_factory()
        self._accounts = SQLAlchemyAccountRepository(self.session)
        return self

    def __exit__(
        self,
        exc_type,
        exc,
        traceback,
    ) -> None:
        if exc_type is not None:
            self.rollback()
        if self.session is not None:
            self.session.close()

    def commit(self) -> None:
        if self.session is not None:
            self.session.commit()

    def rollback(self) -> None:
        if self.session is not None:
            self.session.rollback()
