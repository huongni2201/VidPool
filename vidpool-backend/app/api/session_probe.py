import asyncio
import logging
import os
import signal

from fastapi import APIRouter, status

logger = logging.getLogger(__name__)
router = APIRouter(tags=["session"])


@router.get("/session/probe")
def session_probe() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/session/shutdown", status_code=status.HTTP_202_ACCEPTED)
async def session_shutdown() -> dict[str, str]:
    logger.info("backend_shutdown_requested")
    try:
        loop = asyncio.get_running_loop()
        loop.call_later(0.1, lambda: os.kill(os.getpid(), signal.SIGINT))
    except Exception as exc:
        logger.warning("Could not schedule shutdown signal: %s", exc)
    return {"status": "shutting_down"}
