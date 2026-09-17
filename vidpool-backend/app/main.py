from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="VidPool Local API",
        version="0.1.0",
    )
    app.include_router(health_router, prefix="/api")
    return app


app = create_app()
