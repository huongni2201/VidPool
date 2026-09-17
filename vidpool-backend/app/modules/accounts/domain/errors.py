"""Account domain exceptions."""


class AccountDomainError(Exception):
    """Base exception for account domain errors."""


class InvalidAccountStateError(AccountDomainError):
    """Raised when an operation is invalid for the account's current state."""


class AccountNotFoundError(AccountDomainError):
    """Raised when an account is not found."""


AccountNotFound = AccountNotFoundError


class AccountInUseError(AccountDomainError):
    """Raised when an account is currently leased or has an open session."""


AccountInUse = AccountInUseError


class InvalidProfileKey(AccountDomainError):
    """Raised when a profile key is malformed or attempts directory traversal."""


AccountError = AccountDomainError


class BrowserSessionNotOpen(AccountDomainError):
    """Raised when an operation requires an active browser session that is not open."""


class BrowserProfileInUse(AccountDomainError):
    """Raised when attempting to open an already open browser profile."""


class BrowserUnavailable(AccountDomainError):
    """Raised when no supported browser (Edge, Chrome) is installed or runnable."""


class BrowserLaunchFailed(AccountDomainError):
    """Raised when launching a specific browser channel fails."""


class ProviderNotRegistered(AccountDomainError):
    """Raised when requesting an unregistered provider key."""


class SessionInvalid(AccountDomainError):
    """Raised when browser session validation fails during login completion."""


class AccountUnavailable(AccountDomainError):
    """Raised when no eligible account can be leased."""


class LeaseNotFound(AccountDomainError):
    """Raised when releasing an unknown or missing lease."""
