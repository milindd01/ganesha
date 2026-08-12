#!/usr/bin/env python3
"""
Build a Sites-compatible dist/ folder for this static gallery.

The output layout is:
  dist/server/index.js   - Worker entry point
  dist/...               - static files served by the ASSETS binding

For hosting, images are resized and recompressed into web-friendly JPEGs so the
deployment archive fits within the hosting size limit. Original project media is
left untouched.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from refresh_gallery_manifest import (
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
    build_decorations_manifest,
    build_manifest,
)


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
HEIF_CONVERTER = shutil.which("heif-convert")
BUNDLED_PYTHON = Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "python" / "bin" / "python3"
RESIZE_HELPER = ROOT / "scripts" / "resize_image_with_pillow.py"
MAX_IMAGE_DIMENSION = 1400
JPEG_QUALITY = 55

COPY_PATHS = [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "assets",
    "icons",
]

SERVER_JS = """\
const NOT_FOUND = 404;

function shouldServeAppShell(pathname) {
  return pathname === "/" || pathname === "/index.html";
}

async function fetchAsset(request, env, pathname) {
  return env.ASSETS.fetch(new Request(new URL(pathname, request.url), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname || "/";

    if (shouldServeAppShell(pathname)) {
      return fetchAsset(request, env, "/index.html");
    }

    const assetResponse = await fetchAsset(request, env, pathname);
    if (assetResponse.status !== NOT_FOUND) {
      return assetResponse;
    }

    if (!pathname.includes(".")) {
      return fetchAsset(request, env, "/index.html");
    }

    return assetResponse;
  },
};
"""


def copy_path(relative_path: str) -> None:
    source = ROOT / relative_path
    target = DIST / relative_path
    if source.is_dir():
      shutil.copytree(source, target, dirs_exist_ok=True)
    else:
      target.parent.mkdir(parents=True, exist_ok=True)
      shutil.copy2(source, target)


def write_manifest(manifest: dict[int, list[dict[str, str]]], decorations: list[dict[str, str]]) -> None:
    output = DIST / "assets" / "js" / "photos.js"
    header = (
        "/*\n"
        "  This file is auto-generated for the hosted build.\n"
        "  It uses optimized media copies for faster web delivery.\n"
        "*/\n"
        "window.GANESH_PHOTOS = {\n"
    )
    lines = [header]
    for year in range(2001, 2027):
        lines.append(f"  {year}: {json.dumps(manifest.get(year, []), ensure_ascii=False)},\n")
    lines.append("};\n")
    lines.append(f"window.GANESH_DECORATIONS = {json.dumps(decorations, ensure_ascii=False)};\n")
    output.write_text("".join(lines), encoding="utf-8")


def detect_image_format(source: Path) -> str:
    result = subprocess.run(
        ["/usr/bin/sips", "-g", "format", str(source)],
        check=True,
        capture_output=True,
        text=True,
    )
    for line in result.stdout.splitlines():
        if "format:" in line:
            return line.split("format:", 1)[1].strip().lower()
    return source.suffix.lower().lstrip(".")


def optimize_image(source: Path, relative_target: str) -> str:
    target_relative = Path(relative_target).with_suffix(".jpg")
    target = DIST / target_relative
    target.parent.mkdir(parents=True, exist_ok=True)
    image_format = detect_image_format(source)

    resize_source = source
    temp_path: Path | None = None
    if image_format in {"heic", "heif"}:
        if not HEIF_CONVERTER:
            raise RuntimeError("heif-convert is required to optimize HEIC/HEIF images")

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_path = Path(temp_file.name)

        subprocess.run(
            [
                HEIF_CONVERTER,
                str(source),
                str(temp_path),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        resize_source = temp_path

    resize_python = BUNDLED_PYTHON if BUNDLED_PYTHON.exists() else Path("/usr/bin/python3")
    try:
        subprocess.run(
            [
                str(resize_python),
                str(RESIZE_HELPER),
                str(resize_source),
                str(target),
                str(MAX_IMAGE_DIMENSION),
                str(JPEG_QUALITY),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    return target_relative.as_posix()


def copy_video(source: Path, relative_target: str) -> str:
    target = DIST / relative_target
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return relative_target


def build_optimized_media() -> tuple[dict[int, list[dict[str, str]]], list[dict[str, str]]]:
    manifest = build_manifest()
    decorations = build_decorations_manifest()
    optimized_manifest: dict[int, list[dict[str, str]]] = {}
    optimized_decorations: list[dict[str, str]] = []
    optimized_cache: dict[str, str] = {}

    for year, items in manifest.items():
        optimized_items: list[dict[str, str]] = []
        for item in items:
            relative_src = item["src"]
            source = ROOT / relative_src
            suffix = source.suffix.lower()

            optimized_item = dict(item)
            if suffix in IMAGE_EXTENSIONS:
                optimized_item["src"] = optimized_cache.setdefault(
                    relative_src,
                    optimize_image(source, relative_src),
                )
            elif suffix in VIDEO_EXTENSIONS:
                optimized_item["src"] = optimized_cache.setdefault(
                    relative_src,
                    copy_video(source, relative_src),
                )
                poster = item.get("poster")
                if poster:
                    poster_source = ROOT / poster
                    optimized_item["poster"] = optimized_cache.setdefault(
                        poster,
                        optimize_image(poster_source, poster),
                    )
            optimized_items.append(optimized_item)
        optimized_manifest[year] = optimized_items

    for item in decorations:
        relative_src = item["src"]
        source = ROOT / relative_src
        suffix = source.suffix.lower()

        optimized_item = dict(item)
        if suffix in IMAGE_EXTENSIONS:
            optimized_item["src"] = optimized_cache.setdefault(
                relative_src,
                optimize_image(source, relative_src),
            )
        elif suffix in VIDEO_EXTENSIONS:
            optimized_item["src"] = optimized_cache.setdefault(
                relative_src,
                copy_video(source, relative_src),
            )
            poster = item.get("poster")
            if poster:
                poster_source = ROOT / poster
                optimized_item["poster"] = optimized_cache.setdefault(
                    poster,
                    optimize_image(poster_source, poster),
                )
        optimized_decorations.append(optimized_item)

    return optimized_manifest, optimized_decorations


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)

    (DIST / "server").mkdir(parents=True, exist_ok=True)
    for relative_path in COPY_PATHS:
        copy_path(relative_path)

    optimized_manifest, optimized_decorations = build_optimized_media()
    write_manifest(optimized_manifest, optimized_decorations)
    (DIST / "server" / "index.js").write_text(SERVER_JS, encoding="utf-8")


if __name__ == "__main__":
    main()
