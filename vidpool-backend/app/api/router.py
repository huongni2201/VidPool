from fastapi import APIRouter, Depends

from app.api.health import router as health_router
from app.api.session_probe import router as session_probe_router
from app.core.security import require_session

public_api_router = APIRouter()
public_api_router.include_router(health_router)

protected_api_router = APIRouter(
    dependencies=[Depends(require_session)],
)
protected_api_router.include_router(session_probe_router)
