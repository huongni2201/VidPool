from fastapi import APIRouter

router = APIRouter(tags=["session"])


@router.get("/session/probe")
def session_probe() -> dict[str, str]:
    return {"status": "ok"}
