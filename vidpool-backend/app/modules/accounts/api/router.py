import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.modules.accounts.application.queries import AccountView
from app.modules.accounts.application.service import AccountService
from app.modules.accounts.domain.errors import (
    AccountInUse,
    AccountNotFound,
    BrowserProfileInUse,
    BrowserSessionNotOpen,
    BrowserUnavailable,
    DuplicateProviderIdentity,
    InvalidAccountState,
    InvalidProfileKey,
    ProviderNotRegistered,
    ProviderUnavailable,
    SessionInvalid,
)
from app.modules.accounts.domain.values import AccountId

from .schemas import (
    AccountResponse,
    ProviderResponse,
    StartLoginResponse,
)

router = APIRouter()


def get_account_service(request: Request) -> AccountService:
    container = getattr(request.app.state, "container", None)
    if container is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account service unavailable",
        )
    return container.account_service


def parse_account_id(account_id: str) -> AccountId:
    try:
        return AccountId(uuid.UUID(account_id))
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid account ID: '{account_id}'",
        ) from err


def _handle_error(exc: Exception) -> None:
    if isinstance(exc, (ProviderNotRegistered, AccountNotFound)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(
        exc,
        (
            AccountInUse,
            DuplicateProviderIdentity,
            SessionInvalid,
            BrowserProfileInUse,
            BrowserSessionNotOpen,
            InvalidAccountState,
        ),
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, (BrowserUnavailable, ProviderUnavailable)):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if isinstance(exc, InvalidProfileKey):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal profile error"
        )
    raise exc


def _serialize_account(view: AccountView) -> AccountResponse:
    return AccountResponse(
        id=str(view.id),
        providerKey=view.provider_key,
        displayName=view.display_name,
        externalIdentity=view.external_identity,
        status=str(view.status),
        lastUsedAt=view.last_used_at,
        lastValidatedAt=view.last_validated_at,
        cooldownUntil=view.cooldown_until,
    )


@router.get("/providers", response_model=list[ProviderResponse])
def list_providers(
    service: AccountService = Depends(get_account_service),
) -> list[ProviderResponse]:
    return [
        ProviderResponse(
            key=p.key,
            displayName=p.display_name,
            authKind=p.auth_kind,
        )
        for p in service.list_providers()
    ]


@router.get("/accounts", response_model=list[AccountResponse])
def list_accounts(
    provider_key: str | None = None,
    service: AccountService = Depends(get_account_service),
) -> list[AccountResponse]:
    return [_serialize_account(acc) for acc in service.list_accounts(provider_key)]


@router.get("/accounts/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        return _serialize_account(service.get_account(parsed_id))
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/providers/{provider_key}/accounts/login/start", response_model=StartLoginResponse)
def start_login(
    provider_key: str,
    service: AccountService = Depends(get_account_service),
) -> StartLoginResponse:
    try:
        res = service.start_login(provider_key)
        return StartLoginResponse(
            accountId=str(res.account_id),
            status=res.status,
        )
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/login/complete", response_model=AccountResponse)
def complete_login(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        view = service.complete_login(parsed_id)
        return _serialize_account(view)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/login/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_login(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> Response:
    parsed_id = parse_account_id(account_id)
    try:
        service.cancel_new_login(parsed_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/relogin/cancel", response_model=AccountResponse)
def cancel_relogin(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        view = service.cancel_relogin(parsed_id)
        return _serialize_account(view)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/relogin/start", response_model=StartLoginResponse)
def start_relogin(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> StartLoginResponse:
    parsed_id = parse_account_id(account_id)
    try:
        res = service.start_relogin(parsed_id)
        return StartLoginResponse(
            accountId=str(res.account_id),
            status=res.status,
        )
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/validate", response_model=AccountResponse)
def validate_account(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        view = service.validate_account(parsed_id)
        return _serialize_account(view)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/enable", response_model=AccountResponse)
def enable_account(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        view = service.enable_account(parsed_id)
        return _serialize_account(view)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.post("/accounts/{account_id}/disable", response_model=AccountResponse)
def disable_account(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> AccountResponse:
    parsed_id = parse_account_id(account_id)
    try:
        view = service.disable_account(parsed_id)
        return _serialize_account(view)
    except Exception as exc:
        _handle_error(exc)
        raise


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: str,
    service: AccountService = Depends(get_account_service),
) -> Response:
    parsed_id = parse_account_id(account_id)
    try:
        service.delete_account(parsed_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        _handle_error(exc)
        raise
