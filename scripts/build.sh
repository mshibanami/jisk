#!/bin/bash

set -ex

cd "$(dirname "$0")/.."

./scripts/download_instances.sh

npx tsc

# Specify ELEVENTY_ENV to use the correct environment
npx eleventy

# OUT_DIR="./out"
#
# Minify
# for file in "$OUT_DIR"/*.{html,js,css}; do
#     [ -f "$file" ] || continue
#     npx minify "$file" >"${file}.min" && mv "${file}.min" "$file"
# done
