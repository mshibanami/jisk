#!/bin/bash

set -ex

SERVICES=(
    "invidious https://api.invidious.io/instances.json?pretty=1&sort_by=type,users"
    "redlib https://raw.githubusercontent.com/redlib-org/redlib-instances/refs/heads/main/instances.json"
    "rimgo https://codeberg.org/rimgo/rimgo/raw/branch/main/instances.json"
)

BASE_DIR="src/_data/generated"

while [[ "$#" -gt 0 ]]; do
    case $1 in
    --base-dir)
        BASE_DIR="$2"
        shift
        ;;
    *)
        echo "Unknown parameter passed: $1"
        exit 1
        ;;
    esac
    shift
done

cd "$(dirname "$0")/.."

for service in "${SERVICES[@]}"; do
    service_name=$(echo "$service" | awk '{print $1}')
    url=$(echo "$service" | awk '{print $2}')

    SAVE_PATH="$BASE_DIR/$service_name/instances.json"
    mkdir -p "$(dirname "$SAVE_PATH")"

    echo "Downloading instances.json for $service_name..."
    if curl -o "$SAVE_PATH" "$url"; then
        echo "Saved: $(realpath "$SAVE_PATH")"
    else
        echo "Failed to download instances.json for $service_name."
    fi
done
