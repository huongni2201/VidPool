from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.session_probe import router as session_probe_router
from app.core.config import AppConfig, load_config


def create_app(config: AppConfig | None = None) -> FastAPI:
    resolved_config = config if config is not None else load_config()

    app = FastAPI(
        title="VidPool Local API",
        version="0.1.0",
    )
    app.state.config = resolved_config

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_config.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(session_probe_router, prefix="/api")
    return app


app = create_app()
