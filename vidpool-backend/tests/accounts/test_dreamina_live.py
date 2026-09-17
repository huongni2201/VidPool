import os
from pathlib import Path

import pytest

from app.core.container import build_container
from app.modules.accounts.application.ports import SessionValidation

pytestmark = pytest.mark.skipif(
    os.getenv("VIDPOOL_RUN_DREAMINA_LIVE_TESTS") != "1",
    reason="Dreamina live tests require an authenticated local browser profile",
)


def test_persisted_dreamina_profile_is_valid(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    profile_key = os.getenv("VIDPOOL_DREAMINA_TEST_PROFILE_KEY")
    if not profile_key:
        pytest.skip("VIDPOOL_DREAMINA_TEST_PROFILE_KEY not set")

    monkeypatch.setenv("VIDPOOL_DATA_DIR", str(tmp_path))

    container = build_container()
    try:
        providers = container.provider_registry
        assert providers is not None
        adapter = providers.get_auth("dreamina")
        assert adapter is not None

        result = adapter.validate_persisted_session(profile_key)
        assert isinstance(result, SessionValidation)
        assert isinstance(result.valid, bool)
    finally:
        container.close()
