from dataclasses import dataclass
import os


@dataclass(frozen=True, slots=True)
class AppConfig:
    host: str
    port: int
    session_token: str | None
    allowed_origins: tuple[str, ...]


def _parse_origins(value: str | None) -> tuple[str, ...]:
    if not value:
        return (
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        )

    return tuple(
        item.strip()
        for item in value.split(",")
        if item.strip()
    )


def load_config() -> AppConfig:
    return AppConfig(
        host=os.getenv("VIDPOOL_API_HOST", "127.0.0.1"),
        port=int(os.getenv("VIDPOOL_API_PORT", "8000")),
        session_token=os.getenv("VIDPOOL_SESSION_TOKEN"),
        allowed_origins=_parse_origins(
            os.getenv("VIDPOOL_ALLOWED_ORIGINS")
        ),
    )
