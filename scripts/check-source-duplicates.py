"""Check for identical non-trivial source file duplicates in the repository."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SEARCH_DIRS = [
    ROOT / "vidpool-backend" / "app",
    ROOT / "vidpool-frontend" / "src",
]

EXTENSIONS = {".py", ".ts", ".tsx"}

EXCLUDE_PARTS = {"node_modules", "dist", "__pycache__", ".venv", "build"}


def normalize_content(text: str) -> str:
    """Normalize lines by stripping trailing whitespace and discarding empty lines."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def main() -> int:
    hashes: dict[str, list[Path]] = {}
    files_checked = 0

    for search_dir in SEARCH_DIRS:
        if not search_dir.exists():
            continue
        for path in search_dir.rglob("*"):
            if not path.is_file() or path.suffix not in EXTENSIONS:
                continue
            if any(part in path.parts for part in EXCLUDE_PARTS):
                continue

            try:
                content = path.read_text(encoding="utf-8")
            except Exception:
                continue

            normalized = normalize_content(content)
            # Ignore trivial files (e.g. single re-export or barrel with <= 3 lines)
            if len(normalized.splitlines()) <= 3 or len(normalized) < 80:
                continue

            content_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
            hashes.setdefault(content_hash, []).append(path)
            files_checked += 1

    duplicates = [paths for paths in hashes.values() if len(paths) > 1]

    if duplicates:
        print(f"[ERROR] Found {len(duplicates)} duplicate source file group(s):", file=sys.stderr)
        for group in duplicates:
            print("\nIdentical normalized content:", file=sys.stderr)
            for p in group:
                print(f"  - {p.relative_to(ROOT)}", file=sys.stderr)
        return 1

    print(f"[source-duplicates] Checked {files_checked} source files. No duplicates found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
