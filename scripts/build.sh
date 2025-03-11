#!/bin/bash

set -ex

cd "$(dirname "$0")/.."

./scripts/download_instances.sh

npx tsc

npx eleventy

OUT_DIR="./out"

# Compression
for file in "$OUT_DIR"/*.html; do
    [ -f "$file" ] || continue
    npx html-minifier \
        --collapse-whitespace \
        --remove-comments \
        --minify-css true \
        --minify-js true \
        "$file" -o "${file}.min" && mv "${file}.min" "$file"
done
