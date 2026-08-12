#!/bin/bash
cd "$(dirname "$0")"
python3 scripts/refresh_gallery_manifest.py
python3 scripts/build_sites_dist.py
rm -rf docs
cp -R dist docs
touch docs/.nojekyll
echo
echo "GitHub Pages folder is ready in: docs/"
