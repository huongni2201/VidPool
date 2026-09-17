from fastapi import APIRouter, Depends

from app.core.security import require_session

router = APIRouter(tags=["session"])


@router.get("/session/probe", dependencies=[Depends(require_session)])
def session_probe() -> dict[str, str]:
    return {"status": "ok"}
