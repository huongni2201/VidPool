"""Validate documentation integrity, manifest consistency, and internal markdown links."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "DOCS-MANIFEST.md"


def check_manifest() -> list[str]:
    errors = []
    if not MANIFEST_PATH.exists():
        return ["DOCS-MANIFEST.md is missing."]

    content = MANIFEST_PATH.read_text(encoding="utf-8")
    listed_paths = re.findall(r"-\s+`([^`]+)`", content)

    for rel_path in listed_paths:
        full_path = ROOT / rel_path
        if not full_path.exists():
            errors.append(f"DOCS-MANIFEST lists non-existent file: {rel_path}")

    return errors


def check_markdown_links() -> list[str]:
    errors = []
    md_files = [ROOT / "AGENTS.md", ROOT / "ARCHITECTURE-CHECKLIST.md", ROOT / "README.md", ROOT / "DOCS-MANIFEST.md"]
    md_files.extend(ROOT.glob("docs/**/*.md"))

    link_pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")

    for md_file in md_files:
        if not md_file.is_file():
            continue
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception as e:
            errors.append(f"Failed to read {md_file}: {e}")
            continue

        for match in link_pattern.finditer(content):
            target = match.group(2).strip()

            # Ignore external URLs, anchors, file:// or mailto:
            if target.startswith(("http://", "https://", "#", "mailto:", "file:///")):
                continue

            # Strip anchor fragment
            clean_target = target.split("#")[0].strip()
            if not clean_target:
                continue

            # Resolve relative link
            target_path = (md_file.parent / clean_target).resolve()
            if not target_path.exists():
                # Also try relative to repo root
                root_target_path = (ROOT / clean_target.lstrip("/")).resolve()
                if not root_target_path.exists():
                    rel_source = md_file.relative_to(ROOT)
                    errors.append(f"{rel_source}: broken link to '{clean_target}'")

    return errors


def main() -> int:
    manifest_errors = check_manifest()
    link_errors = check_markdown_links()

    all_errors = manifest_errors + link_errors

    if all_errors:
        print(f"[ERROR] Found {len(all_errors)} documentation issues:\n", file=sys.stderr)
        for err in all_errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("[docs-check] All manifest entries and markdown links verified successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
