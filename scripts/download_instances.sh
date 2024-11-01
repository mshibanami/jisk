#!/bin/bash

cd "$(dirname "$0")/.."

SERVICES=(
    "redlib https://raw.githubusercontent.com/redlib-org/redlib-instances/refs/heads/main/instances.json"
    "invidious https://api.invidious.io/instances.json?pretty=1&sort_by=type,users"
)

BASE_DIR="src/_data/generated"

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
