#!/usr/bin/env python3
"""Build and package the FastAPI backend as a Tauri sidecar executable."""

from pathlib import Path
import platform
import shutil
import subprocess
import sys


def get_target_triple() -> str:
    """Detect current Rust target triple using rustc or platform fallback."""
    # 1. Try rustc in PATH
    try:
        proc = subprocess.run(
            ["rustc", "-vV"],
            capture_output=True,
            text=True,
            check=True,
        )
        for line in proc.stdout.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    # 2. Try ~/.cargo/bin/rustc
    cargo_rustc = Path.home() / ".cargo" / "bin" / ("rustc.exe" if sys.platform == "win32" else "rustc")
    if cargo_rustc.exists():
        try:
            proc = subprocess.run(
                [str(cargo_rustc), "-vV"],
                capture_output=True,
                text=True,
                check=True,
            )
            for line in proc.stdout.splitlines():
                if line.startswith("host:"):
                    return line.split(":", 1)[1].strip()
        except subprocess.CalledProcessError:
            pass

    # 3. Fallback based on OS and architecture
    machine = platform.machine().lower()
    if sys.platform == "win32":
        arch = "x86_64" if machine in {"amd64", "x86_64"} else machine
        return f"{arch}-pc-windows-msvc"
    elif sys.platform == "darwin":
        arch = "aarch64" if machine in {"arm64", "aarch64"} else "x86_64"
        return f"{arch}-apple-darwin"
    elif sys.platform.startswith("linux"):
        arch = "x86_64" if machine in {"amd64", "x86_64"} else machine
        return f"{arch}-unknown-linux-gnu"

    raise RuntimeError(f"Unsupported platform: {sys.platform} ({machine})")


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    backend_dir = repo_root / "vidpool-backend"
    bootstrap_file = backend_dir / "app" / "bootstrap.py"

    if not bootstrap_file.exists():
        raise FileNotFoundError(f"Bootstrap entrypoint not found: {bootstrap_file}")

    target_triple = get_target_triple()
    print(f"Target triple: {target_triple}")

    build_temp_dir = repo_root / ".tmp" / "sidecar-build"
    dist_dir = build_temp_dir / "dist"
    work_dir = build_temp_dir / "build"
    spec_dir = build_temp_dir / "spec"

    dist_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    spec_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--clean",
        "--noconfirm",
        "--onefile",
        "--name",
        "vidpool-backend",
        "--paths",
        str(backend_dir),
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(work_dir),
        "--specpath",
        str(spec_dir),
        str(bootstrap_file),
    ]

    print(f"Running PyInstaller: {' '.join(cmd[:4])} ...")
    result = subprocess.run(cmd, cwd=backend_dir)
    if result.returncode != 0:
        raise RuntimeError(f"PyInstaller failed with exit code {result.returncode}")

    ext = ".exe" if sys.platform == "win32" else ""
    built_binary = dist_dir / f"vidpool-backend{ext}"

    if not built_binary.exists() or built_binary.stat().st_size == 0:
        raise FileNotFoundError(f"Expected binary was not created: {built_binary}")

    binaries_dir = repo_root / "vidpool-frontend" / "src-tauri" / "binaries"
    binaries_dir.mkdir(parents=True, exist_ok=True)

    dest_binary = binaries_dir / f"vidpool-backend-{target_triple}{ext}"
    print(f"Copying {built_binary.name} -> {dest_binary}")
    shutil.copy2(built_binary, dest_binary)

    if not dest_binary.exists() or dest_binary.stat().st_size == 0:
        raise RuntimeError(f"Failed to verify copied binary at {dest_binary}")

    print(f"Successfully packaged sidecar: {dest_binary} ({dest_binary.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
