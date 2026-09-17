from typing import Protocol, Self

from app.modules.accounts.application.ports import AccountRepositoryPort


class AccountUnitOfWorkPort(Protocol):
    @property
    def accounts(self) -> AccountRepositoryPort: ...

    def __enter__(self) -> Self: ...

    def __exit__(
        self,
        exc_type,
        exc,
        traceback,
    ) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
