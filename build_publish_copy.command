#!/bin/bash
cd "$(dirname "$0")"
python3 scripts/refresh_gallery_manifest.py
python3 scripts/build_sites_dist.py
echo
echo "Web publish copy is ready in: dist/"
echo "Original photos remain unchanged in: photos/"
