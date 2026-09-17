import os
from pathlib import Path

import pytest

from app.core.container import build_container
from app.modules.accounts.application.ports import SessionValidation
from app.modules.accounts.infrastructure.browser.profile_paths import (
    BrowserProfilePathResolver,
)

pytestmark = pytest.mark.skipif(
    os.getenv("VIDPOOL_RUN_DREAMINA_LIVE_TESTS") != "1",
    reason="Dreamina live tests require an authenticated local browser profile",
)


def test_persisted_dreamina_profile_is_valid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_dir_value = os.getenv("VIDPOOL_DREAMINA_TEST_DATA_DIR")
    profile_key = os.getenv("VIDPOOL_DREAMINA_TEST_PROFILE_KEY")

    if not data_dir_value:
        pytest.skip("VIDPOOL_DREAMINA_TEST_DATA_DIR not set")
    if not profile_key:
        pytest.skip("VIDPOOL_DREAMINA_TEST_PROFILE_KEY not set")

    data_dir = Path(data_dir_value).expanduser().resolve()
    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(data_dir))

    resolver = BrowserProfilePathResolver(data_dir)
    profile_path = resolver.resolve(profile_key)

    assert profile_path.is_dir(), (
        f"Dreamina test profile does not exist: {profile_path}"
    )

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None

        adapter = providers.get_auth("dreamina")
        assert adapter is not None

        result = adapter.validate_persisted_session(profile_key)

        assert isinstance(result, SessionValidation)
        assert result.valid is True
    finally:
        container.close()

