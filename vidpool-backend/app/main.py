from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import protected_api_router, public_api_router
from app.core.config import AppConfig, load_config
from app.core.container import AppContainer, build_container


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    container = getattr(app.state, "container", None)
    if container is not None and hasattr(container, "browser_session_manager"):
        container.browser_session_manager.close_all()


def create_app(
    config: AppConfig | None = None,
    container: AppContainer | None = None,
) -> FastAPI:
    resolved_config = config if config is not None else load_config()
    resolved_container = container if container is not None else build_container(resolved_config)

    app = FastAPI(
        title="VidPool Local API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.config = resolved_config
    app.state.container = resolved_container

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_config.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(public_api_router, prefix="/api")
    app.include_router(protected_api_router, prefix="/api")
    return app


app = create_app()
