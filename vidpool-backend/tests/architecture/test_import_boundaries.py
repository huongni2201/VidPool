import ast
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent.parent / "app"
ACCOUNTS_DIR = APP_DIR / "modules" / "accounts"
APPLICATION_DIR = ACCOUNTS_DIR / "application"
DOMAIN_DIR = ACCOUNTS_DIR / "domain"


def _get_imports(file_path: Path) -> list[str]:
    """Parse a python file and return all imported module names."""
    tree = ast.parse(file_path.read_text(encoding="utf-8"), filename=str(file_path))
    imports: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module)
    return imports


def test_domain_and_application_never_import_playwright() -> None:
    """Task 23.1: Prevent Playwright imports outside infrastructure."""
    checked_files: list[Path] = []
    for directory in [DOMAIN_DIR, APPLICATION_DIR]:
        for py_file in directory.glob("**/*.py"):
            checked_files.append(py_file)
            imported_modules = _get_imports(py_file)
            for mod in imported_modules:
                assert not mod.startswith("playwright"), (
                    f"Forbidden import '{mod}' found in {py_file}. Playwright must only be in infrastructure."
                )

    assert len(checked_files) > 0


def test_application_does_not_import_browser_runtime_or_session_manager() -> None:
    """Task 23.2: Prevent concrete BrowserRuntime dependency in application."""
    for py_file in APPLICATION_DIR.glob("**/*.py"):
        content = py_file.read_text(encoding="utf-8")
        assert "BrowserRuntime" not in content, (
            f"Found concrete 'BrowserRuntime' reference in application file: {py_file}"
        )
        assert "PlaywrightBrowserSessionManager" not in content, (
            f"Found obsolete 'PlaywrightBrowserSessionManager' in application file: {py_file}"
        )


def test_application_does_not_import_infrastructure() -> None:
    """Task 23.3: Ensure application does not import infrastructure."""
    for py_file in APPLICATION_DIR.glob("**/*.py"):
        imported_modules = _get_imports(py_file)
        for mod in imported_modules:
            assert not mod.startswith("app.modules.accounts.infrastructure"), (
                f"Application file {py_file} violates boundary by importing {mod}"
            )
            assert "infrastructure" not in mod.split("."), (
                f"Application file {py_file} violates boundary by importing {mod}"
            )


def test_domain_does_not_import_application_or_infrastructure() -> None:
    """Domain layer must remain purely inward with zero outer dependencies."""
    for py_file in DOMAIN_DIR.glob("**/*.py"):
        imported_modules = _get_imports(py_file)
        for mod in imported_modules:
            assert not mod.startswith("app.modules.accounts.application"), (
                f"Domain file {py_file} must not import application: {mod}"
            )
            assert not mod.startswith("app.modules.accounts.infrastructure"), (
                f"Domain file {py_file} must not import infrastructure: {mod}"
            )


def test_domain_never_imports_frameworks_or_orm() -> None:
    """Rule 1: Domain must not import fastapi, sqlalchemy, playwright, or tauri."""
    forbidden = {"fastapi", "sqlalchemy", "playwright", "tauri"}
    for py_file in DOMAIN_DIR.glob("**/*.py"):
        imported_modules = _get_imports(py_file)
        for mod in imported_modules:
            top_mod = mod.split(".")[0]
            assert top_mod not in forbidden, (
                f"Domain file {py_file} violates boundary by importing forbidden package: {mod}"
            )


def test_application_never_imports_frameworks_or_orm() -> None:
    """Rule 2: Application must not import fastapi, sqlalchemy, or playwright."""
    forbidden = {"fastapi", "sqlalchemy", "playwright"}
    for py_file in APPLICATION_DIR.glob("**/*.py"):
        imported_modules = _get_imports(py_file)
        for mod in imported_modules:
            top_mod = mod.split(".")[0]
            assert top_mod not in forbidden, (
                f"Application file {py_file} violates boundary by importing forbidden package: {mod}"
            )
