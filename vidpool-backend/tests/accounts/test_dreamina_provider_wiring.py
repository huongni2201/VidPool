from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import AppConfig
from app.core.container import build_container
from app.main import create_app
from app.modules.accounts.infrastructure.providers.dreamina.auth_adapter import (
    DreaminaAuthAdapter,
)


def test_default_container_registers_dreamina(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None

        definitions = providers.list()

        assert any(
            item.key == "dreamina"
            and item.display_name == "Dreamina (Seedance)"
            and item.auth_kind == "browser_session"
            for item in definitions
        )
    finally:
        container.close()


def test_dreamina_adapter_uses_container_browser_runtime(
    tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None

        adapter = providers.get_auth("dreamina")
        assert adapter is not None
        assert isinstance(adapter, DreaminaAuthAdapter)
        assert adapter._browser is container.browser_runtime
    finally:
        container.close()


def test_api_providers_exposes_dreamina(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    container = build_container()
    try:
        config = AppConfig(
            host="127.0.0.1",
            port=8000,
            session_token="secret",
            allowed_origins=("http://localhost:5173",),
        )
        app = create_app(config=config, container=container)
        with TestClient(app) as client:
            res = client.get(
                "/api/providers",
                headers={"Authorization": "Bearer secret"},
            )
            assert res.status_code == 200
            data = res.json()
            assert any(
                item["key"] == "dreamina"
                and item["displayName"] == "Dreamina (Seedance)"
                and item["authKind"] == "browser_session"
                for item in data
            )
    finally:
        container.close()
