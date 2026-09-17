import secrets

from fastapi import HTTPException, Request, status


def require_session(request: Request) -> None:
    expected = request.app.state.config.session_token

    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="App session is not configured",
        )

    authorization = request.headers.get("Authorization", "")
    prefix = "Bearer "

    if not authorization.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid app session",
        )

    supplied = authorization[len(prefix) :]

    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid app session",
        )
