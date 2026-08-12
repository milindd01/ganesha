#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "usage: resize_image_with_pillow.py <source> <destination> <max-dimension> <quality>"
        )

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    max_dimension = int(sys.argv[3])
    quality = int(sys.argv[4])

    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        elif image.mode == "L":
            image = image.convert("RGB")

        image.thumbnail((max_dimension, max_dimension))
        image.save(destination, format="JPEG", quality=quality, optimize=True)


if __name__ == "__main__":
    main()
