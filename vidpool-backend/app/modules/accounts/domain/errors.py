"""Account domain exceptions."""


class AccountDomainError(Exception):
    """Base exception for account domain errors."""


class InvalidAccountStateError(AccountDomainError):
    """Raised when an operation is invalid for the account's current state."""


class AccountNotFoundError(AccountDomainError):
    """Raised when an account is not found."""


class AccountInUseError(AccountDomainError):
    """Raised when an account is currently leased or has an open session."""
